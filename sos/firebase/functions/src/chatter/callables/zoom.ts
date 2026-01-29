/**
 * Zoom Callables - Cloud Functions for Zoom meetings management
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import * as zoomService from "../services/chatterZoomService";

const db = () => getFirestore();

// ============================================================================
// USER CALLABLES
// ============================================================================

/**
 * Get upcoming Zoom meetings for chatters
 */
export const getZoomMeetings = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { type = "upcoming", limit = 10 } = request.data || {};

    try {
      if (type === "past") {
        const meetings = await zoomService.getPastMeetings(limit);
        return { success: true, meetings };
      } else {
        const meetings = await zoomService.getUpcomingMeetings(limit);
        return { success: true, meetings };
      }
    } catch (error) {
      console.error("Error getting zoom meetings:", error);
      throw new HttpsError("internal", "Failed to get meetings");
    }
  }
);

/**
 * Record attendance for a Zoom meeting
 */
export const recordZoomAttendance = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { meetingId } = request.data;

    if (!meetingId) {
      throw new HttpsError("invalid-argument", "Meeting ID is required");
    }

    // Verify user is a chatter
    const userDoc = await db().collection("users").doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "chatter") {
      throw new HttpsError("permission-denied", "Only chatters can record attendance");
    }

    try {
      const result = await zoomService.recordAttendance({
        chatterId: request.auth.uid,
        meetingId,
      });

      if (!result.success) {
        throw new HttpsError("failed-precondition", result.error || "Failed to record attendance");
      }

      return result;
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("Error recording attendance:", error);
      throw new HttpsError("internal", "Failed to record attendance");
    }
  }
);

/**
 * Get chatter's attendance history
 */
export const getMyZoomAttendances = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    try {
      const attendances = await zoomService.getChatterAttendances(request.auth.uid);
      return { success: true, attendances };
    } catch (error) {
      console.error("Error getting attendances:", error);
      throw new HttpsError("internal", "Failed to get attendances");
    }
  }
);

// ============================================================================
// ADMIN CALLABLES
// ============================================================================

/**
 * Create a new Zoom meeting (admin only)
 */
export const adminCreateZoomMeeting = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Verify admin
    const userDoc = await db().collection("users").doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const {
      title,
      description,
      scheduledAt,
      durationMinutes,
      zoomUrl,
      zoomId,
      bonusAmount,
      maxParticipants,
      topics,
      hostName,
      language,
    } = request.data;

    if (!title || !scheduledAt || !zoomUrl || !zoomId) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    try {
      const meeting = await zoomService.createZoomMeeting({
        title,
        description,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes || 60,
        zoomUrl,
        zoomId,
        bonusAmount: bonusAmount || 500, // Default $5
        maxParticipants,
        topics,
        hostName,
        language,
      });

      return { success: true, meeting };
    } catch (error) {
      console.error("Error creating meeting:", error);
      throw new HttpsError("internal", "Failed to create meeting");
    }
  }
);

/**
 * Update a Zoom meeting (admin only)
 */
export const adminUpdateZoomMeeting = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Verify admin
    const userDoc = await db().collection("users").doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { meetingId, ...updates } = request.data;

    if (!meetingId) {
      throw new HttpsError("invalid-argument", "Meeting ID is required");
    }

    try {
      // Convert scheduledAt if provided
      if (updates.scheduledAt) {
        updates.scheduledAt = new Date(updates.scheduledAt);
      }

      await zoomService.updateZoomMeeting(meetingId, updates);
      return { success: true };
    } catch (error) {
      console.error("Error updating meeting:", error);
      throw new HttpsError("internal", "Failed to update meeting");
    }
  }
);

/**
 * Get all meetings with filters (admin only)
 */
export const adminGetZoomMeetings = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Verify admin
    const userDoc = await db().collection("users").doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { status, limit = 20, offset = 0 } = request.data || {};

    try {
      const result = await zoomService.getAllMeetings({ status, limit, offset });
      return { success: true, ...result };
    } catch (error) {
      console.error("Error getting meetings:", error);
      throw new HttpsError("internal", "Failed to get meetings");
    }
  }
);

/**
 * Get meeting attendees (admin only)
 */
export const adminGetMeetingAttendees = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Verify admin
    const userDoc = await db().collection("users").doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { meetingId } = request.data;

    if (!meetingId) {
      throw new HttpsError("invalid-argument", "Meeting ID is required");
    }

    try {
      const attendees = await zoomService.getMeetingAttendees(meetingId);
      return { success: true, attendees };
    } catch (error) {
      console.error("Error getting attendees:", error);
      throw new HttpsError("internal", "Failed to get attendees");
    }
  }
);

/**
 * Update meeting status (admin only)
 */
export const adminUpdateMeetingStatus = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Verify admin
    const userDoc = await db().collection("users").doc(request.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { meetingId, status } = request.data;

    if (!meetingId || !status) {
      throw new HttpsError("invalid-argument", "Meeting ID and status are required");
    }

    const validStatuses = ["scheduled", "live", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new HttpsError("invalid-argument", "Invalid status");
    }

    try {
      switch (status) {
        case "live":
          await zoomService.setMeetingLive(meetingId);
          break;
        case "completed":
          await zoomService.completeMeeting(meetingId);
          break;
        case "cancelled":
          await zoomService.cancelMeeting(meetingId);
          break;
        default:
          await zoomService.updateZoomMeeting(meetingId, { status });
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating meeting status:", error);
      throw new HttpsError("internal", "Failed to update meeting status");
    }
  }
);
