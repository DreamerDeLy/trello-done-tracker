import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;

if (!TRELLO_API_KEY || !TRELLO_API_TOKEN || !TRELLO_BOARD_ID) {
    console.error('Error: Please set TRELLO_API_KEY, TRELLO_API_TOKEN, and TRELLO_BOARD_ID in your .env file.');
    process.exit(1);
}

// Serve static files (like your HTML)
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to parse date from "Done!" comment
function parseDoneDate(comment) {
    if (comment.data && comment.data.text && comment.data.text.includes('Done!')) {
        return new Date(comment.date);
    }
    return null;
}

// Helper function to get date key for grouping
function getDateKey(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Helper function to get week key for grouping
function getWeekKey(date) {
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

// Helper function to get week number according to ISO 8601
function getWeekNumber(date) {
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

app.get('/api/done-tasks', async (req, res) => {
    try {
        // 1. Get all lists (columns) on the board
        const listsUrl = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
        const listsResponse = await fetch(listsUrl);
        const lists = await listsResponse.json();

        // Initialize counts
        let eveDoneCount = 0;
        let dimaDoneCount = 0;
        let evePendingCount = 0;
        let dimaPendingCount = 0;

        // Iterate through all lists to categorize and count cards
        for (const list of lists) {
            const cardsUrl = `https://api.trello.com/1/lists/${list.id}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
            const cardsResponse = await fetch(cardsUrl);
            const cards = await cardsResponse.json();

            const listName = list.name.toLowerCase();

            // Count done tasks
            if (listName.includes('done')) {
                if (listName.includes('eve')) {
                    eveDoneCount += cards.length;
                } else if (listName.includes('dima')) {
                    dimaDoneCount += cards.length;
                }
            }

            // Count total tasks (from today and week lists)
            if (listName.includes('today') || listName.includes('week')) {
                if (listName.includes('eve')) {
                    evePendingCount += cards.length;
                } else if (listName.includes('dima')) {
                    dimaPendingCount += cards.length;
                }
            }
        }

        // Calculate pending tasks for each
        const eveTotalCount = evePendingCount + eveDoneCount;
        const dimaTotalCount = dimaPendingCount + dimaDoneCount;

        // Also include total done and pending for the overall pie chart (if needed later)
        const totalDone = eveDoneCount + dimaDoneCount;
        const totalPending = evePendingCount + dimaPendingCount;

        res.json({
            eve: {
                done: eveDoneCount,
                total: eveTotalCount,
                pending: evePendingCount
            },
            dima: {
                done: dimaDoneCount,
                total: dimaTotalCount,
                pending: dimaPendingCount
            },
            // For the overall pie chart if you decide to keep it or add back
            total: {
                done: totalDone,
                pending: Math.max(0, totalPending) // Ensure non-negative
            }
        });

    } catch (error) {
        console.error('Error fetching Trello data:', error);
        res.status(500).json({ error: 'Failed to fetch Trello data' });
    }
});

// New endpoint for daily statistics
app.get('/api/daily-stats', async (req, res) => {
    try {
        const listsUrl = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
        const listsResponse = await fetch(listsUrl);
        const lists = await listsResponse.json();

        const dailyStats = {};
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        for (const list of lists) {
            const listName = list.name.toLowerCase();
            
            // Only process 'done' lists
            if (listName.includes('done')) {
                const cardsUrl = `https://api.trello.com/1/lists/${list.id}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
                const cardsResponse = await fetch(cardsUrl);
                const cards = await cardsResponse.json();

                for (const card of cards) {
                    // Get comments (actions) for each card
                    const actionsUrl = `https://api.trello.com/1/cards/${card.id}/actions?filter=commentCard&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
                    const actionsResponse = await fetch(actionsUrl);
                    const actions = await actionsResponse.json();

                    // Find "Done!" comments
                    for (const action of actions) {
                        const doneDate = parseDoneDate(action);
                        if (doneDate && doneDate >= last30Days) {
                            const dateKey = getDateKey(doneDate);
                            
                            if (!dailyStats[dateKey]) {
                                dailyStats[dateKey] = { eve: 0, dima: 0, total: 0 };
                            }
                            
                            if (listName.includes('eve')) {
                                dailyStats[dateKey].eve++;
                            } else if (listName.includes('dima')) {
                                dailyStats[dateKey].dima++;
                            }
                            dailyStats[dateKey].total++;
                        }
                    }
                }
            }
        }

        res.json(dailyStats);
    } catch (error) {
        console.error('Error fetching daily stats:', error);
        res.status(500).json({ error: 'Failed to fetch daily statistics' });
    }
});

// New endpoint for weekly statistics
app.get('/api/weekly-stats', async (req, res) => {
    try {
        const listsUrl = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
        const listsResponse = await fetch(listsUrl);
        const lists = await listsResponse.json();

        const weeklyStats = {};
        const last12Weeks = new Date();
        last12Weeks.setDate(last12Weeks.getDate() - (12 * 7));

        for (const list of lists) {
            const listName = list.name.toLowerCase();
            
            // Only process 'done' lists
            if (listName.includes('done')) {
                const cardsUrl = `https://api.trello.com/1/lists/${list.id}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
                const cardsResponse = await fetch(cardsUrl);
                const cards = await cardsResponse.json();

                for (const card of cards) {
                    // Get comments (actions) for each card
                    const actionsUrl = `https://api.trello.com/1/cards/${card.id}/actions?filter=commentCard&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
                    const actionsResponse = await fetch(actionsUrl);
                    const actions = await actionsResponse.json();

                    // Find "Done!" comments
                    for (const action of actions) {
                        const doneDate = parseDoneDate(action);
                        if (doneDate && doneDate >= last12Weeks) {
                            const weekKey = getWeekKey(doneDate);
                            
                            if (!weeklyStats[weekKey]) {
                                weeklyStats[weekKey] = { eve: 0, dima: 0, total: 0 };
                            }
                            
                            if (listName.includes('eve')) {
                                weeklyStats[weekKey].eve++;
                            } else if (listName.includes('dima')) {
                                weeklyStats[weekKey].dima++;
                            }
                            weeklyStats[weekKey].total++;
                        }
                    }
                }
            }
        }

        res.json(weeklyStats);
    } catch (error) {
        console.error('Error fetching weekly stats:', error);
        res.status(500).json({ error: 'Failed to fetch weekly statistics' });
    }
});

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
