const request = require('supertest');
const app = require('../app');

describe('Kanban API', () => {
  let testItemId;
  
  // GET /api/board
  describe('GET /api/board', () => {
    it('should return board with columns', async () => {
      const res = await request(app).get('/api/board');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('columns');
      expect(Array.isArray(res.body.columns)).toBe(true);
      expect(res.body.columns.length).toBeGreaterThan(0);
    });
  });
  
  // POST /api/items
  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const newItem = {
        title: 'Test Item ' + Date.now(),
        description: 'Test description',
        priority: 'high',
        tags: ['test'],
        createdBy: 'jimmy'
      };
      
      const res = await request(app)
        .post('/api/items')
        .send(newItem);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe(newItem.title);
      expect(res.body.description).toBe(newItem.description);
      expect(res.body.priority).toBe(newItem.priority);
      expect(res.body.createdBy).toBe('jimmy');
      
      testItemId = res.body.id;
    });
    
    it('should reject item without title', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ description: 'No title' });
      
      expect(res.status).toBe(400);
    });
  });
  
  // PUT /api/items/:id
  describe('PUT /api/items/:id', () => {
    it('should update an existing item', async () => {
      const updates = {
        title: 'Updated Title ' + Date.now(),
        priority: 'low'
      };
      
      const res = await request(app)
        .put(`/api/items/${testItemId}`)
        .send(updates);
      
      expect(res.status).toBe(200);
      expect(res.body.title).toBe(updates.title);
      expect(res.body.priority).toBe(updates.priority);
    });
    
    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .put('/api/items/nonexistent-id')
        .send({ title: 'Test' });
      
      expect(res.status).toBe(404);
    });
  });
  
  // POST /api/items/:id/move
  describe('POST /api/items/:id/move', () => {
    it('should move item to a different column', async () => {
      const res = await request(app)
        .post(`/api/items/${testItemId}/move`)
        .send({ toColumnId: 'doing', movedBy: 'jimmy' });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('item');
      expect(res.body.toColumn).toBe('doing');
    });
    
    it('should reject move to invalid column', async () => {
      const res = await request(app)
        .post(`/api/items/${testItemId}/move`)
        .send({ toColumnId: 'invalid-column' });
      
      expect(res.status).toBe(400);
    });
  });
  
  // POST /api/items/:id/comments
  describe('POST /api/items/:id/comments', () => {
    it('should add a comment to item', async () => {
      const comment = {
        text: 'Test comment ' + Date.now(),
        author: 'jimmy'
      };
      
      const res = await request(app)
        .post(`/api/items/${testItemId}/comments`)
        .send(comment);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.text).toBe(comment.text);
      expect(res.body.author).toBe(comment.author);
    });
    
    it('should return 404 for comment on non-existent item', async () => {
      const res = await request(app)
        .post('/api/items/nonexistent-id/comments')
        .send({ text: 'Test', author: 'jimmy' });
      
      expect(res.status).toBe(404);
    });
  });
  
  // GET /api/notifications
  describe('GET /api/notifications', () => {
    it('should return notifications array', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
  
  // DELETE /api/items/:id
  describe('DELETE /api/items/:id', () => {
    it('should delete the test item', async () => {
      const res = await request(app)
        .delete(`/api/items/${testItemId}`);
      
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testItemId);
    });
    
    it('should return 404 for already deleted item', async () => {
      const res = await request(app)
        .delete(`/api/items/${testItemId}`);
      
      expect(res.status).toBe(404);
    });
  });
});
