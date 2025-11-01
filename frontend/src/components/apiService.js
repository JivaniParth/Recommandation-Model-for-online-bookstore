// Add these methods to your existing apiService.js file
// frontend/src/Components/apiService.js

// Add these constants at the top
const RECOMMENDATION_API_BASE = "http://localhost:4000/api";

// Add these methods to the ApiService class:

  // ==================== RECOMMENDATIONS ====================
  
  async getRecommendations(userId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${RECOMMENDATION_API_BASE}/recommendations/${userId}${
      queryString ? `?${queryString}` : ''
    }`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await this.handleResponse(response);
  }

  // ==================== A/B TESTING ====================
  
  async getABAssignment(userId) {
    const response = await fetch(
      `${RECOMMENDATION_API_BASE}/ab/user/${userId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return await this.handleResponse(response);
  }

  async assignAllUsers(modelIds = [1, 2, 3]) {
    const response = await fetch(
      `${RECOMMENDATION_API_BASE}/ab/assign-all?models=${modelIds.join(',')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return await this.handleResponse(response);
  }

  // ==================== EVENT LOGGING ====================
  
  async logRecommendationEvent(eventData) {
    const response = await fetch(`${RECOMMENDATION_API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    return await this.handleResponse(response);
  }

  async getModelEventCounts(modelId) {
    const response = await fetch(
      `${RECOMMENDATION_API_BASE}/events/model/${modelId}/counts`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return await this.handleResponse(response);
  }