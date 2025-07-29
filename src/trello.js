import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;

// Validate environment variables
if (!TRELLO_API_KEY || !TRELLO_API_TOKEN || !TRELLO_BOARD_ID) {
    console.error('Error: Please set TRELLO_API_KEY, TRELLO_API_TOKEN, and TRELLO_BOARD_ID in your .env file.');
    process.exit(1);
}

/**
 * Base function to make Trello API requests with error handling
 * @param {string} url - The API endpoint URL
 * @returns {Promise<any>} - The JSON response from the API
 */
async function makeTrelloRequest(url) {
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error making Trello API request to ${url}:`, error);
        throw error;
    }
}

/**
 * Get all lists (columns) from a Trello board
 * @returns {Promise<Array>} - Array of list objects
 */
export async function getBoardLists() {
    const url = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
    return await makeTrelloRequest(url);
}

/**
 * Get all cards from a specific list
 * @param {string} listId - The ID of the list
 * @returns {Promise<Array>} - Array of card objects
 */
export async function getCardsForList(listId) {
    const url = `https://api.trello.com/1/lists/${listId}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
    return await makeTrelloRequest(url);
}

/**
 * Get all actions (comments) for a specific card
 * @param {string} cardId - The ID of the card
 * @returns {Promise<Array>} - Array of action objects
 */
export async function getCardActions(cardId) {
    const url = `https://api.trello.com/1/cards/${cardId}/actions?filter=commentCard&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
    return await makeTrelloRequest(url);
}

/**
 * Get board information
 * @returns {Promise<Object>} - Board object
 */
export async function getBoardInfo() {
    const url = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
    return await makeTrelloRequest(url);
}

/**
 * Get card details by ID
 * @param {string} cardId - The ID of the card
 * @returns {Promise<Object>} - Card object
 */
export async function getCardById(cardId) {
    const url = `https://api.trello.com/1/cards/${cardId}?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
    return await makeTrelloRequest(url);
}

/**
 * Get all cards from the board with optional filter
 * @param {string} filter - Optional filter for cards (e.g., 'open', 'closed', 'all')
 * @returns {Promise<Array>} - Array of card objects
 */
export async function getBoardCards(filter = 'all') {
    const url = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/cards?filter=${filter}&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
    return await makeTrelloRequest(url);
}

/**
 * Helper function to get cards with their actions in one call
 * @param {string} listId - The ID of the list
 * @returns {Promise<Array>} - Array of card objects with actions
 */
export async function getCardsWithActions(listId) {
    const cards = await getCardsForList(listId);
    
    // Fetch actions for all cards in parallel
    const cardsWithActions = await Promise.all(
        cards.map(async (card) => {
            const actions = await getCardActions(card.id);
            return {
                ...card,
                actions
            };
        })
    );
    
    return cardsWithActions;
}

/**
 * Batch function to get multiple lists with their cards
 * @param {Array<string>} listIds - Array of list IDs
 * @returns {Promise<Array>} - Array of list objects with cards
 */
export async function getListsWithCards(listIds) {
    const listsWithCards = await Promise.all(
        listIds.map(async (listId) => {
            const [listInfo, cards] = await Promise.all([
                makeTrelloRequest(`https://api.trello.com/1/lists/${listId}?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`),
                getCardsForList(listId)
            ]);
            
            return {
                ...listInfo,
                cards
            };
        })
    );
    
    return listsWithCards;
}

/**
 * Get configuration object with API credentials (for debugging)
 * @returns {Object} - Configuration object without sensitive data
 */
export function getApiConfig() {
    return {
        boardId: TRELLO_BOARD_ID,
        hasApiKey: !!TRELLO_API_KEY,
        hasToken: !!TRELLO_API_TOKEN
    };
}
