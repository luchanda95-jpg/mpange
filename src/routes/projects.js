// src/routes/projects.js

const express = require('express');
const router = express.Router();

// Assuming you have middleware for protecting routes (e.g., authentication)
// const { protect } = require('../middleware/authMiddleware'); 

// Import all controller functions as a single object
const projectsController = require('../controllers/projects');

// Project Routes

// Public route to get all projects
router.get('/', projectsController.getProjects);

// Public route to get projects by a specific creator (if implemented)
// router.get('/creator/:creatorId', projectsController.getProjectsByCreator); 

// Protected route to create a new project
// If you have auth, uncomment the 'protect' middleware:
// router.post('/', protect, projectsController.createProject);
router.post('/', projectsController.createProject); // <--- Line 22: Calls a function

// Public route to get a single project by ID
router.get('/:id', projectsController.getProjectById);

// Protected routes to update and delete
// router.put('/:id', protect, projectsController.updateProject);
// router.delete('/:id', protect, projectsController.deleteProject);

module.exports = router;