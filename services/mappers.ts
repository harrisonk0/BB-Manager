import { Boy, AuditLog, Section } from '../types';

export const getTableName = (section: Section | null, resource: 'boys' | 'audit_logs') => {
    if (resource === 'audit_logs' && section === null) return 'audit_logs'; 
    if (!section) return `global_${resource}`;
    return `${section}_${resource}`;
};

export const toMillis = (ts: string | number | null | undefined): number => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    return new Date(ts).getTime();
};

export const toISO = (millis: number): string => {
    return new Date(millis).toISOString();
};

export const validateBoyMarks = (boy: Boy, section: Section) => {
    if (!Array.isArray(boy.marks)) throw new Error("Marks must be an array.");
    
    for (const mark of boy.marks) {
        if (typeof mark.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(mark.date)) {
            throw new Error(`Invalid date format for mark: ${mark.date}`);
        }
        if (typeof mark.score !== 'number') {
            throw new Error(`Invalid score type for mark on ${mark.date}. Score must be a number.`);
        }
        if (mark.score === -1) continue;

        if (mark.score.toString().split('.')[1]?.length > 2) {
             throw new Error(`Total score for ${boy.name} on ${mark.date} has more than 2 decimal places.`);
        }

        if (section === 'company') {
            if (mark.score < 0 || mark.score > 10) throw new Error(`Score out of range.`);
        } else { 
            if (typeof mark.uniformScore !== 'number' || mark.uniformScore < 0 || mark.uniformScore > 10) throw new Error(`Uniform score invalid.`);
            if (typeof mark.behaviourScore !== 'number' || mark.behaviourScore < 0 || mark.behaviourScore > 5) throw new Error(`Behaviour score invalid.`);
        }
    }
};

export const mapBoyToDB = (boy: Boy) => ({
    id: boy.id,
    name: boy.name,
    squad: boy.squad,
    year: boy.year,
    marks: boy.marks,
    is_squad_leader: boy.isSquadLeader
});

export const mapBoyFromDB = (data: any): Boy => ({
    id: data.id,
    name: data.name,
    squad: data.squad,
    year: data.year,
    marks: data.marks || [],
    isSquadLeader: data.is_squad_leader
});

export const mapLogToDB = (log: AuditLog) => {
    const payload: any = {
        timestamp: toISO(log.timestamp),
        user_email: log.userEmail,
        action_type: log.actionType,
        description: log.description,
        revert_data: log.revertData,
        reverted_log_id: log.revertedLogId
    };
    if (log.id) payload.id = log.id;
    return payload;
};

export const mapLogFromDB = (data: any): AuditLog => ({
    id: data.id,
    timestamp: toMillis(data.timestamp),
    userEmail: data.user_email,
    actionType: data.action_type,
    description: data.description,
    revertData: data.revert_data,
    revertedLogId: data.reverted_log_id,
    section: null 
});

/**
 * Performs a deep equality check on two simple objects (used for comparing decrypted data).
 */
export const deepEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
            return false;
        }
    }
    return true;
};