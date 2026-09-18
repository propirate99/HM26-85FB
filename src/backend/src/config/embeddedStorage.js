import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
const dbFilePath = path.join(dataDir, "civicverify_db.json");

function haversineMeters(lng1, lat1, lng2, lat2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  const random = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, "0");
  return timestamp + "0000" + random.slice(0, 4);
}

export class EmbeddedStorageEngine {
  constructor() {
    this.collections = {
      User: new Map(),
      Zone: new Map(),
      IssueCategory: new Map(),
      CivicIssue: new Map(),
      Report: new Map(),
      Evidence: new Map(),
      IssueEvent: new Map(),
      Notification: new Map(),
      SystemConfig: new Map(),
    };
    this.saveTimeout = null;
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(dbFilePath)) {
        const raw = fs.readFileSync(dbFilePath, "utf8");
        const parsed = JSON.parse(raw);
        for (const [colName, docs] of Object.entries(parsed)) {
          if (!this.collections[colName]) this.collections[colName] = new Map();
          for (const doc of docs) {
            const id = String(doc._id || doc.id);
            this.collections[colName].set(id, { ...doc, _id: id });
          }
        }
        console.log(`[EmbeddedDB] Loaded ${Object.keys(parsed).length} collections from disk.`);
      }
    } catch (err) {
      console.warn("[EmbeddedDB] Failed to load db file, starting fresh:", err.message);
    }
  }

  scheduleSave() {
    this.saveToDisk();
  }

  saveToDisk() {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dump = {};
      for (const [name, map] of Object.entries(this.collections)) {
        dump[name] = Array.from(map.values());
      }
      const tmp = `${dbFilePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(dump, null, 2), "utf8");
      fs.renameSync(tmp, dbFilePath);
    } catch (err) {
      console.error("[EmbeddedDB] Failed to persist data to disk:", err.message);
    }
  }

  getCollection(name) {
    if (!this.collections[name]) {
      this.collections[name] = new Map();
    }
    return this.collections[name];
  }

  matchesQuery(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;
    for (const [key, val] of Object.entries(query)) {
      if (key === "$or" && Array.isArray(val)) {
        if (!val.some((subQuery) => this.matchesQuery(doc, subQuery))) return false;
        continue;
      }

      if (key === "location" && val?.$nearSphere) {
        // $nearSphere matching is handled in query execution for ordering & distance filtering
        continue;
      }

      let docVal = doc[key];
      if (key === "isActive" && docVal === undefined) {
        docVal = true;
      }

      if (val instanceof RegExp) {
        if (!val.test(String(docVal ?? ""))) return false;
        continue;
      }

      if (val && typeof val === "object" && !Array.isArray(val)) {
        if (val.$nin && Array.isArray(val.$nin)) {
          const sDoc = String(docVal ?? "");
          if (val.$nin.map(String).includes(sDoc)) return false;
          continue;
        }
        if (val.$in && Array.isArray(val.$in)) {
          const sDoc = String(docVal ?? "");
          if (!val.$in.map(String).includes(sDoc)) return false;
          continue;
        }
        if (val.$ne !== undefined) {
          if (String(docVal ?? "") === String(val.$ne)) return false;
          continue;
        }
        if (val.$exists !== undefined) {
          const exists = docVal !== undefined && docVal !== null;
          if (Boolean(val.$exists) !== exists) return false;
          continue;
        }
      }

      if (String(docVal ?? "") !== String(val ?? "")) {
        return false;
      }
    }
    return true;
  }

  createDocumentInstance(colName, rawDoc) {
    const engine = this;
    const doc = { ...rawDoc };
    if (!doc._id) doc._id = generateId();
    doc._id = String(doc._id);

    return new Proxy(doc, {
      get(target, prop, receiver) {
        if (prop === "_id" || prop === "id") return target._id;
        if (prop === "save") {
          return async function () {
            target.updatedAt = new Date();
            const col = engine.getCollection(colName);
            col.set(target._id, { ...target });
            engine.scheduleSave();
            return receiver;
          };
        }
        if (prop === "populate") {
          return async function (field) {
            await engine.populateDoc(colName, target, field);
            return receiver;
          };
        }
        if (prop === "toObject" || prop === "toJSON") {
          return () => ({ ...target });
        }
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value) {
        Reflect.set(target, prop, value);
        return true;
      },
    });
  }

  async populateDoc(colName, doc, fieldSpec, select) {
    const field = typeof fieldSpec === "string" ? fieldSpec : fieldSpec?.path;
    if (!field) return;

    let targetCol = null;
    if (field === "categoryId" || field === "citizenSelectedCategoryId") targetCol = "IssueCategory";
    else if (field === "zoneId" || field === "citizenSelectedZoneId" || field === "assignedZoneId") targetCol = "Zone";
    else if (field === "assignedOfficerId" || field === "citizenId" || field === "actorId" || field === "supporters") targetCol = "User";
    else if (field === "issueId") targetCol = "CivicIssue";
    else if (field === "reportId") targetCol = "Report";

    if (!targetCol) return;

    const rawRef = doc[field];
    if (!rawRef) return;

    const col = this.getCollection(targetCol);

    if (Array.isArray(rawRef)) {
      doc[field] = rawRef
        .map((refId) => {
          const found = col.get(String(refId?._id || refId));
          return found ? this.createDocumentInstance(targetCol, found) : null;
        })
        .filter(Boolean);
      return;
    }

    const refId = String(rawRef._id || rawRef);
    const found = col.get(refId);
    if (found) {
      let populated = this.createDocumentInstance(targetCol, found);
      if (select && typeof select === "string") {
        const fields = select.split(" ").filter(Boolean);
        const filtered = { _id: populated._id };
        for (const f of fields) {
          filtered[f] = populated[f];
        }
        doc[field] = filtered;
      } else {
        doc[field] = populated;
      }
    }
  }

  createQuery(colName, queryObj = {}) {
    const engine = this;
    const col = this.getCollection(colName);
    let sortObj = null;
    let limitNum = null;
    const populateQueue = [];

    const query = {
      populate(pathOrObj, select) {
        populateQueue.push({ path: pathOrObj, select });
        return query;
      },
      sort(criteria) {
        sortObj = criteria;
        return query;
      },
      limit(n) {
        limitNum = n;
        return query;
      },
      select() {
        return query;
      },
      async exec() {
        let docs = Array.from(col.values());

        // Handle $nearSphere query
        if (queryObj?.location?.$nearSphere) {
          const sphere = queryObj.location.$nearSphere;
          const [lng, lat] = sphere.$geometry.coordinates;
          const maxDist = sphere.$maxDistance ?? Infinity;

          docs = docs
            .map((d) => {
              const coords = d.location?.coordinates;
              if (!coords || coords.length < 2) return null;
              const dist = haversineMeters(lng, lat, coords[0], coords[1]);
              return { doc: d, dist };
            })
            .filter((item) => item !== null && item.dist <= maxDist)
            .sort((a, b) => a.dist - b.dist)
            .map((item) => item.doc);
        }

        // Apply general query filter
        let results = docs.filter((d) => engine.matchesQuery(d, queryObj));

        // Sort
        if (sortObj) {
          const [[k, dir]] = Object.entries(sortObj);
          const mult = dir === -1 || dir === "desc" ? -1 : 1;
          results.sort((a, b) => {
            const vA = a[k] ?? "";
            const vB = b[k] ?? "";
            if (vA < vB) return -1 * mult;
            if (vA > vB) return 1 * mult;
            return 0;
          });
        }

        // Limit
        if (limitNum != null && limitNum > 0) {
          results = results.slice(0, limitNum);
        }

        // Wrap as document instances
        const docInstances = results.map((d) => engine.createDocumentInstance(colName, d));

        // Apply population
        for (const item of docInstances) {
          for (const p of populateQueue) {
            await engine.populateDoc(colName, item, p.path, p.select);
          }
        }

        return docInstances;
      },
      then(resolve, reject) {
        return this.exec().then(resolve, reject);
      },
      catch(reject) {
        return this.exec().catch(reject);
      },
    };

    return query;
  }
}

export function patchMongooseForEmbedded(mongoose, engine) {
  const models = mongoose.models;

  for (const [name, model] of Object.entries(models)) {
    const colName = name;

    model.find = function (filter = {}) {
      return engine.createQuery(colName, filter);
    };

    model.findOne = function (filter = {}) {
      const q = engine.createQuery(colName, filter);
      const originalExec = q.exec.bind(q);
      q.exec = async () => {
        const rows = await originalExec();
        return rows[0] || null;
      };
      return q;
    };

    model.findById = function (id) {
      return model.findOne({ _id: String(id) });
    };

    model.create = async function (docs) {
      const items = Array.isArray(docs) ? docs : [docs];
      const created = [];
      const col = engine.getCollection(colName);
      for (const item of items) {
        const id = item._id ? String(item._id) : generateId();
        const doc = {
          ...item,
          _id: id,
          createdAt: item.createdAt || new Date(),
          updatedAt: item.updatedAt || new Date(),
        };
        col.set(id, doc);
        created.push(engine.createDocumentInstance(colName, doc));
      }
      engine.scheduleSave();
      return Array.isArray(docs) ? created : created[0];
    };

    model.findOneAndUpdate = async function (filter, update, options = {}) {
      let doc = await model.findOne(filter);
      const col = engine.getCollection(colName);
      if (!doc) {
        if (options.upsert) {
          const raw = { ...filter, ...update, _id: generateId() };
          col.set(raw._id, raw);
          engine.scheduleSave();
          doc = engine.createDocumentInstance(colName, raw);
          return doc;
        }
        return null;
      }

      Object.assign(doc, update);
      await doc.save();
      return doc;
    };

    model.findByIdAndUpdate = async function (id, update, options = {}) {
      return model.findOneAndUpdate({ _id: String(id) }, update, options);
    };

    model.updateOne = async function (filter, update) {
      const doc = await model.findOne(filter);
      if (doc) {
        Object.assign(doc, update);
        await doc.save();
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    };

    model.deleteMany = async function (filter = {}) {
      const col = engine.getCollection(colName);
      if (!filter || Object.keys(filter).length === 0) {
        const count = col.size;
        col.clear();
        engine.scheduleSave();
        return { deletedCount: count };
      }
      let deletedCount = 0;
      for (const [id, doc] of Array.from(col.entries())) {
        if (engine.matchesQuery(doc, filter)) {
          col.delete(id);
          deletedCount++;
        }
      }
      engine.scheduleSave();
      return { deletedCount };
    };

    model.countDocuments = async function (filter = {}) {
      const docs = await model.find(filter);
      return docs.length;
    };

    model.syncIndexes = async function () {
      return true;
    };

    model.aggregate = async function (pipeline = []) {
      const docs = Array.from(engine.getCollection(colName).values());
      let result = docs;
      for (const stage of pipeline) {
        if (stage.$group) {
          const groupField = stage.$group._id;
          const groups = new Map();
          for (const d of result) {
            let key = null;
            if (typeof groupField === "string" && groupField.startsWith("$")) {
              key = d[groupField.slice(1)];
            }
            const count = groups.get(key) || 0;
            groups.set(key, count + 1);
          }
          result = Array.from(groups.entries()).map(([id, n]) => ({ _id: id, n }));
        }
      }
      return result;
    };

    // Override prototype save and populate
    model.prototype.save = async function () {
      const col = engine.getCollection(colName);
      const id = this._id ? String(this._id) : generateId();
      this._id = id;
      this.updatedAt = new Date();
      if (!this.createdAt) this.createdAt = new Date();
      const plain = { ...this };
      col.set(id, plain);
      engine.scheduleSave();
      return this;
    };

    model.prototype.populate = async function (path, select) {
      await engine.populateDoc(colName, this, path, select);
      return this;
    };
  }

  console.log(`[EmbeddedDB] Patched ${Object.keys(models).length} Mongoose models for standalone mode.`);
}
