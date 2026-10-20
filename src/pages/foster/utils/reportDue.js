// One place for the weekly report due date, so every foster page agrees.
// Due = last weekly update (or the start date) + 7 days.
export function getNextReportDue(assignment) {
    const updates = assignment?.updates || [];
    const last = updates.length ? updates[updates.length - 1].createdAt : null;

    const due = new Date(
        last || assignment?.startDate || assignment?.createdAt || Date.now()
    );
    due.setDate(due.getDate() + 7);
    return due;
}

export function isReportOverdue(assignment) {
    return getNextReportDue(assignment).getTime() < Date.now();
}