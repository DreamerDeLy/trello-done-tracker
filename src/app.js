import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBoardLists, getCardsForList, getCardActions } from './trello.js';
import { parseDoneDate, getDateKey, getWeekKey, getDateRangeStart, getWeekRangeStart } from './date_utils.js';

// Load environment variables from .env file
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (like your HTML)
app.use(express.static(path.join(__dirname, 'public')));


app.get('/api/done-tasks', async (req, res) => {
    try {
        // 1. Get all lists (columns) on the board
        const lists = await getBoardLists();

        // Initialize counts
        let eveDoneCount = 0;
        let dimaDoneCount = 0;
        let evePendingCount = 0;
        let dimaPendingCount = 0;

        // Iterate through all lists to categorize and count cards
        for (const list of lists) {
            const cards = await getCardsForList(list.id);

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
        const lists = await getBoardLists();

        const dailyStats = {};
        const last30Days = getDateRangeStart(30);

        for (const list of lists) {
            const listName = list.name.toLowerCase();
            
            // Only process 'done' lists
            if (listName.includes('done')) {
                const cards = await getCardsForList(list.id);

                for (const card of cards) {
                    // Get comments (actions) for each card
                    const actions = await getCardActions(card.id);

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
        const lists = await getBoardLists();

        const weeklyStats = {};
        const last12Weeks = getWeekRangeStart(12);

        for (const list of lists) {
            const listName = list.name.toLowerCase();
            
            // Only process 'done' lists
            if (listName.includes('done')) {
                const cards = await getCardsForList(list.id);

                for (const card of cards) {
                    // Get comments (actions) for each card
                    const actions = await getCardActions(card.id);

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
