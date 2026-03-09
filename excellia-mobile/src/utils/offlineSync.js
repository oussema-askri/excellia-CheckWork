import AsyncStorage from '@react-native-async-storage/async-storage';
import { attendanceApi } from '../api/attendanceApi';

const QUEUE_KEY = '@offline_queue';
const LOCAL_ATTENDANCE_KEY = '@offline_attendance';

/**
 * Generate a simple unique ID for each queued action.
 */
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/**
 * Get all pending offline actions from the queue.
 */
export const getPendingActions = async () => {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

/**
 * Add an action to the offline queue.
 * @param {'checkIn'|'checkOut'} type
 * @param {object} payload - { location, transportMethod, notes }
 */
export const queueOfflineAction = async (type, payload) => {
    const action = {
        id: generateId(),
        type,
        payload: {
            ...payload,
            offlineTimestamp: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
    };

    const queue = await getPendingActions();
    queue.push(action);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    // Also save local attendance state for UI display
    const localAttendance = await getLocalAttendance();
    if (type === 'checkIn') {
        localAttendance.checkIn = action.payload.offlineTimestamp;
        localAttendance.checkOut = null;
        localAttendance.transportMethodIn = payload.transportMethod;
    } else if (type === 'checkOut') {
        localAttendance.checkOut = action.payload.offlineTimestamp;
        localAttendance.transportMethodOut = payload.transportMethod;
    }
    await AsyncStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(localAttendance));

    return action;
};

/**
 * Remove a successfully synced action from the queue.
 */
const removePendingAction = async (actionId) => {
    const queue = await getPendingActions();
    const filtered = queue.filter((a) => a.id !== actionId);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
};

/**
 * Get locally stored attendance for offline UI display.
 */
export const getLocalAttendance = async () => {
    try {
        const raw = await AsyncStorage.getItem(LOCAL_ATTENDANCE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

/**
 * Clear local attendance state (after successful sync).
 */
export const clearLocalAttendance = async () => {
    await AsyncStorage.removeItem(LOCAL_ATTENDANCE_KEY);
};

/**
 * Attempt to sync all pending offline actions to the backend.
 * Returns { synced: number, failed: number, errors: string[] }
 */
export const syncPendingActions = async () => {
    const queue = await getPendingActions();
    if (queue.length === 0) return { synced: 0, failed: 0, errors: [] };

    let synced = 0;
    let failed = 0;
    const errors = [];

    // Process in chronological order
    const sorted = [...queue].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (const action of sorted) {
        try {
            if (action.type === 'checkIn') {
                await attendanceApi.checkIn(action.payload);
            } else if (action.type === 'checkOut') {
                await attendanceApi.checkOut(action.payload);
            }
            await removePendingAction(action.id);
            synced++;
        } catch (e) {
            // If it's "Already checked in" or similar, remove from queue (already processed)
            const msg = e?.message || '';
            if (msg.includes('Already checked') || msg.includes('already checked')) {
                await removePendingAction(action.id);
                synced++;
            } else {
                failed++;
                errors.push(`${action.type}: ${msg}`);
            }
        }
    }

    // If all synced successfully, clear local attendance
    if (failed === 0) {
        await clearLocalAttendance();
    }

    return { synced, failed, errors };
};

/**
 * Check if there are any pending actions in the queue.
 */
export const hasPendingActions = async () => {
    const queue = await getPendingActions();
    return queue.length > 0;
};

/**
 * Get the count of pending actions.
 */
export const getPendingCount = async () => {
    const queue = await getPendingActions();
    return queue.length;
};
