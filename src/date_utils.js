/**
 * Parse date from "Done!" comment
 * @param {Object} comment - The comment/action object
 * @returns {Date|null} - The parsed date or null if not a "Done!" comment
 */
export function parseDoneDate(comment) {
    if (comment.data && comment.data.text && comment.data.text.includes('Done!')) {
        return new Date(comment.date);
    }
    return null;
}

/**
 * Get date key for grouping (YYYY-MM-DD format)
 * @param {Date} date - The date to format
 * @returns {string} - The formatted date key
 */
export function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Get week key for grouping (YYYY-WXX format)
 * @param {Date} date - The date to get the week for
 * @returns {string} - The formatted week key
 */
export function getWeekKey(date) {
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get week number according to ISO 8601
 * @param {Date} date - The date to get the week number for
 * @returns {number} - The ISO week number
 */
export function getWeekNumber(date) {
    // Create a copy to avoid modifying the original date
    const tempDate = new Date(date.getTime());
    
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday day 7 instead of 0
    const dayNumber = (tempDate.getDay() + 6) % 7;
    tempDate.setDate(tempDate.getDate() - dayNumber + 3);
    
    // Get first Thursday of year
    const firstThursday = new Date(tempDate.getFullYear(), 0, 4);
    const firstThursdayDayNumber = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNumber + 3);
    
    // Calculate week number
    return Math.floor((tempDate.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/**
 * Get date range for the last N days
 * @param {number} days - Number of days to go back
 * @returns {Date} - The start date for the range
 */
export function getDateRangeStart(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

/**
 * Get date range for the last N weeks
 * @param {number} weeks - Number of weeks to go back
 * @returns {Date} - The start date for the range
 */
export function getWeekRangeStart(weeks) {
    const date = new Date();
    date.setDate(date.getDate() - (weeks * 7));
    return date;
}

/**
 * Format date for display
 * @param {Date} date - The date to format
 * @param {string} locale - The locale to use for formatting (default: 'en-US')
 * @returns {string} - The formatted date string
 */
export function formatDateForDisplay(date, locale = 'en-US') {
    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format week for display
 * @param {string} weekKey - The week key (YYYY-WXX format)
 * @returns {string} - The formatted week string
 */
export function formatWeekForDisplay(weekKey) {
    const [year, week] = weekKey.split('-W');
    return `Week ${week}, ${year}`;
}

/**
 * Check if a date is within a specified range
 * @param {Date} date - The date to check
 * @param {Date} startDate - The start of the range
 * @param {Date} endDate - The end of the range (optional, defaults to now)
 * @returns {boolean} - True if the date is within the range
 */
export function isDateInRange(date, startDate, endDate = new Date()) {
    return date >= startDate && date <= endDate;
}
