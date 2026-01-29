/**
 * ChatterZoomService - Service for managing Zoom meetings and attendance
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import type { ChatterZoomMeeting, ChatterZoomAttendance } from "../types";

const db = () => getFirestore();

// ============================================================================
// MEETING MANAGEMENT
// ============================================================================

export interface CreateZoomMeetingInput {
  title: string;
  description?: string;
  scheduledAt: Date;
  durationMinutes: number;
  zoomUrl: string;
  zoomId: string;
  bonusAmount: number;
  maxParticipants?: number;
  topics?: string[];
  hostName?: string;
  language?: string;
}

export async function createZoomMeeting(
  input: CreateZoomMeetingInput
): Promise<ChatterZoomMeeting> {
  const meetingRef = db().collection("chatter_zoom_meetings").doc();

  const meeting: Omit<ChatterZoomMeeting, "id"> = {
    title: input.title,
    description: input.description,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    durationMinutes: input.durationMinutes,
    zoomUrl: input.zoomUrl,
    zoomId: input.zoomId,
    status: "scheduled",
    bonusAmount: input.bonusAmount,
    maxParticipants: input.maxParticipants,
    attendeeCount: 0,
    topics: input.topics || [],
    hostName: input.hostName,
    language: input.language || "fr",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await meetingRef.set(meeting);

  return {
    id: meetingRef.id,
    ...meeting,
  };
}

export async function updateZoomMeeting(
  meetingId: string,
  updates: Partial<
    Pick<
      ChatterZoomMeeting,
      | "title"
      | "description"
      | "scheduledAt"
      | "durationMinutes"
      | "zoomUrl"
      | "zoomId"
      | "bonusAmount"
      | "maxParticipants"
      | "topics"
      | "hostName"
      | "status"
    >
  >
): Promise<void> {
  await db()
    .collection("chatter_zoom_meetings")
    .doc(meetingId)
    .update({
      ...updates,
      updatedAt: Timestamp.now(),
    });
}

export async function getUpcomingMeetings(
  limit = 10
): Promise<ChatterZoomMeeting[]> {
  const snapshot = await db()
    .collection("chatter_zoom_meetings")
    .where("status", "in", ["scheduled", "live"])
    .where("scheduledAt", ">=", Timestamp.now())
    .orderBy("scheduledAt", "asc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChatterZoomMeeting[];
}

export async function getPastMeetings(
  limit = 20
): Promise<ChatterZoomMeeting[]> {
  const snapshot = await db()
    .collection("chatter_zoom_meetings")
    .where("status", "==", "completed")
    .orderBy("scheduledAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChatterZoomMeeting[];
}

export async function getMeetingById(
  meetingId: string
): Promise<ChatterZoomMeeting | null> {
  const doc = await db()
    .collection("chatter_zoom_meetings")
    .doc(meetingId)
    .get();

  if (!doc.exists) return null;

  return {
    id: doc.id,
    ...doc.data(),
  } as ChatterZoomMeeting;
}

// ============================================================================
// ATTENDANCE MANAGEMENT
// ============================================================================

export interface RecordAttendanceInput {
  chatterId: string;
  meetingId: string;
}

export interface RecordAttendanceResult {
  success: boolean;
  attendance?: ChatterZoomAttendance;
  bonusCommissionId?: string;
  error?: string;
}

export async function recordAttendance(
  input: RecordAttendanceInput
): Promise<RecordAttendanceResult> {
  const { chatterId, meetingId } = input;

  // Check if meeting exists and is active
  const meeting = await getMeetingById(meetingId);
  if (!meeting) {
    return { success: false, error: "Meeting not found" };
  }

  if (meeting.status !== "live" && meeting.status !== "scheduled") {
    return { success: false, error: "Meeting is not active" };
  }

  // Check if already attended
  const existingAttendance = await db()
    .collection("chatter_zoom_attendances")
    .where("chatterId", "==", chatterId)
    .where("meetingId", "==", meetingId)
    .limit(1)
    .get();

  if (!existingAttendance.empty) {
    return { success: false, error: "Already recorded attendance" };
  }

  // Create attendance record
  const attendanceRef = db().collection("chatter_zoom_attendances").doc();

  const attendance: Omit<ChatterZoomAttendance, "id"> = {
    chatterId,
    meetingId,
    attendedAt: Timestamp.now(),
    durationAttended: meeting.durationMinutes, // Full attendance assumed
    bonusReceived: false,
  };

  await attendanceRef.set(attendance);

  // Increment attendee count
  await db()
    .collection("chatter_zoom_meetings")
    .doc(meetingId)
    .update({
      attendeeCount: FieldValue.increment(1),
    });

  return {
    success: true,
    attendance: {
      id: attendanceRef.id,
      ...attendance,
    },
  };
}

export async function getChatterAttendances(
  chatterId: string
): Promise<ChatterZoomAttendance[]> {
  const snapshot = await db()
    .collection("chatter_zoom_attendances")
    .where("chatterId", "==", chatterId)
    .orderBy("attendedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChatterZoomAttendance[];
}

export async function markAttendanceBonusPaid(
  attendanceId: string,
  commissionId: string
): Promise<void> {
  await db().collection("chatter_zoom_attendances").doc(attendanceId).update({
    bonusReceived: true,
    bonusCommissionId: commissionId,
  });
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

export async function getAllMeetings(
  options: {
    status?: "scheduled" | "live" | "completed" | "cancelled";
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ meetings: ChatterZoomMeeting[]; total: number }> {
  let query = db().collection("chatter_zoom_meetings").orderBy("scheduledAt", "desc");

  if (options.status) {
    query = query.where("status", "==", options.status);
  }

  // Get total count
  const countSnapshot = await query.count().get();
  const total = countSnapshot.data().count;

  // Apply pagination
  if (options.offset) {
    query = query.offset(options.offset);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();

  return {
    meetings: snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ChatterZoomMeeting[],
    total,
  };
}

export async function getMeetingAttendees(
  meetingId: string
): Promise<ChatterZoomAttendance[]> {
  const snapshot = await db()
    .collection("chatter_zoom_attendances")
    .where("meetingId", "==", meetingId)
    .orderBy("attendedAt", "asc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ChatterZoomAttendance[];
}

export async function cancelMeeting(meetingId: string): Promise<void> {
  await updateZoomMeeting(meetingId, { status: "cancelled" });
}

export async function completeMeeting(meetingId: string): Promise<void> {
  await updateZoomMeeting(meetingId, { status: "completed" });
}

export async function setMeetingLive(meetingId: string): Promise<void> {
  await updateZoomMeeting(meetingId, { status: "live" });
}
