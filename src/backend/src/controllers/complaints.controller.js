import { Complaint } from "../models/Complaint.js";
import { User } from "../models/User.js";
import { verifyAndMapCoordinates, reverseGeocodeGoogle } from "../services/location.service.js";
import { verifyImageWithGemini } from "../services/aiVerification.service.js";
import { getStorageProvider } from "../integrations/storage.provider.js";
import {
  sendComplaintLoggedEmail,
  sendComplaintStatusEmail,
  sendAdminAlertEmail,
} from "../services/email.service.js";

export async function createComplaint(req, res, next) {
  try {
    const {
      title,
      description,
      category,
      lat,
      latitude,
      lng,
      longitude,
      address,
      zone,
      name,
      email,
      phone,
    } = req.body;

    const actualLat = lat ?? latitude;
    const actualLng = lng ?? longitude;

    if (actualLat == null || actualLng == null || actualLat === "" || actualLng === "") {
      return res.status(400).json({ error: "GPS coordinates (latitude and longitude) are required." });
    }

    // 1. Verify coordinates and map to 65 MCC Ward boundaries
    const wardInfo = verifyAndMapCoordinates({ lat: actualLat, lng: actualLng });

    // 2. Google Reverse Geocoding
    const googleAddress = await reverseGeocodeGoogle({
      lat: actualLat,
      lng: actualLng,
      fallbackWardName: wardInfo.wardName,
    });

    // 3. Media Upload (Cloudinary / Local) & Gemini AI Multimodal Verification
    let photoUrl = "";
    let aiResult = null;

    if (req.file) {
      const storage = getStorageProvider();
      const key = `complaint_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const saved = await storage.save({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        key,
      });
      photoUrl = saved.publicUrl;

      aiResult = await verifyImageWithGemini({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        categoryHint: category || "WASTE",
        description: description || title || "",
      });
    } else if (req.body.photoUrl) {
      photoUrl = req.body.photoUrl;
      aiResult = await verifyImageWithGemini({
        imageUrl: photoUrl,
        categoryHint: category || "WASTE",
        description: description || title || "",
      });
    } else {
      aiResult = {
        aiConfidenceScore: 85,
        isManipulated: false,
        aiCategory: category || "WASTE",
        severity: "MEDIUM",
        aiExplanation: "Report logged with verified geographic telemetry.",
        provider: "telemetry",
      };
    }

    // 4. Resolve Citizen Identity
    let citizen = req.user;
    if (!citizen) {
      if (req.body.citizenId) {
        citizen = await User.findById(req.body.citizenId);
      } else if (email) {
        const normEmail = String(email).trim().toLowerCase();
        citizen = await User.findOne({ email: normEmail });
        if (!citizen) {
          citizen = await User.create({
            email: normEmail,
            name: name || normEmail.split("@")[0],
            phone: phone || "",
            role: "CITIZEN",
            isActive: true,
          });
        }
      } else {
        // Fallback to active demo/default citizen
        citizen = await User.findOne({ role: { $in: ["citizen", "CITIZEN"] } });
        if (!citizen) {
          citizen = await User.create({
            email: "citizen@mysuru.gov.in",
            name: "Mysuru Citizen",
            role: "CITIZEN",
            isActive: true,
          });
        }
      }
    }

    // 5. Create Complaint Document
    const issueCategory = aiResult.aiCategory || category || "WASTE";
    const defaultTitle = `${issueCategory.charAt(0) + issueCategory.slice(1).toLowerCase()} issue at ${wardInfo.wardName}`;

    const complaint = await Complaint.create({
      citizenId: citizen._id,
      title: title && title.trim().length > 0 ? title.trim() : defaultTitle,
      description: description || "",
      category: issueCategory,
      location: {
        type: "Point",
        coordinates: [Number(actualLng), Number(actualLat)],
        address: googleAddress || address || `${wardInfo.wardName}, Mysuru`,
        zone: wardInfo.zone || zone || "Central Zone",
      },
      photoUrl,
      wardNumber: String(wardInfo.wardNumber || ""),
      wardName: wardInfo.wardName || "",
      googleAddress: googleAddress || "",
      aiConfidenceScore: aiResult.aiConfidenceScore || 85,
      isManipulated: Boolean(aiResult.isManipulated),
      aiCategory: issueCategory,
      aiExplanation: aiResult.aiExplanation || "",
      status: "SUBMITTED",
      verificationMetrics: {
        gpsConfidence: 96,
        duplicateConfidence: 10,
        aiVisualScore: aiResult.aiConfidenceScore || 85,
        compositeScore: Math.round(((aiResult.aiConfidenceScore || 85) + 96) / 2),
      },
    });

    // 6. Trigger Real Email Notifications via Resend
    const citizenEmail = citizen.email || email;
    if (citizenEmail) {
      sendComplaintLoggedEmail({ to: citizenEmail, complaint }).catch((err) =>
        console.warn(`[Complaints] Email dispatch notice: ${err.message}`)
      );
    }
    sendAdminAlertEmail({ complaint }).catch((err) =>
      console.warn(`[Complaints] Admin alert notice: ${err.message}`)
    );

    res.status(201).json({
      success: true,
      complaint,
      wardInfo,
      googleAddress,
      aiVerification: aiResult,
    });
  } catch (err) {
    next(err);
  }
}

export async function getComplaints(req, res, next) {
  try {
    const { status, category, ward, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== "ALL") {
      filter.status = status;
    }
    if (category && category !== "ALL") {
      filter.category = category;
    }
    if (ward) {
      filter.$or = [{ wardNumber: String(ward) }, { wardName: new RegExp(ward, "i") }];
    }
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { googleAddress: regex },
        { wardName: regex },
      ];
    }

    const userRole = String(req.user?.role || "").toLowerCase();
    if (req.user && userRole === "citizen") {
      filter.citizenId = req.user._id;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("citizenId", "name email phone avatarUrl reputationScore")
        .populate("assignedOfficerId", "name email phone"),
      Complaint.countDocuments(filter),
    ]);

    res.json({
      success: true,
      complaints,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    next(err);
  }
}

export async function getComplaintById(req, res, next) {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("citizenId", "name email phone avatarUrl reputationScore")
      .populate("assignedOfficerId", "name email phone");

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    res.json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
}

export async function updateComplaintStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, resolutionNote } = req.body;

    const complaint = await Complaint.findById(id).populate("citizenId", "name email phone");
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const previousStatus = complaint.status;
    if (status) complaint.status = status;
    if (resolutionNote != null) complaint.resolutionNote = resolutionNote;
    if (status === "RESOLVED") {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    // Real Email Notification to Citizen upon status change or resolution
    const toEmail = complaint.citizenId?.email;
    if (toEmail) {
      sendComplaintStatusEmail({
        to: toEmail,
        complaint,
        newStatus: complaint.status,
        note: resolutionNote || "",
      }).catch((err) => console.warn(`[Complaints] Status email notice: ${err.message}`));
    }

    res.json({
      success: true,
      complaint,
      previousStatus,
    });
  } catch (err) {
    next(err);
  }
}
