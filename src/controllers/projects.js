// src/controllers/projects.js
const Project = require("../models/Projects"); // Ensure this path is correct: 'Projects' or 'Project'
const cloudinary = require("../config/cloudinary");
// NOTE: We don't need to import CloudinaryStorage or Multer here,
// as the middleware (Multer) handles the upload before this function runs.

// ----------------------------------------------------------------------
// 1. GET all projects
// ----------------------------------------------------------------------
// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// ----------------------------------------------------------------------
// 2. GET project by ID
// ----------------------------------------------------------------------
// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Public
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }
    res.json(project);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }
    res.status(500).send("Server Error");
  }
};

// ----------------------------------------------------------------------
// 3. POST create new project (Cloudinary Logic ADDED/CORRECTED)
// ----------------------------------------------------------------------
// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (or Public, depending on your app design)
exports.createProject = async (req, res) => {
  // --- CRITICAL FIX 1: Parse JSON String Fields for 'tags' ---
  // Flutter sends the 'tags' array as a JSON string within the multipart form data.
  if (req.body.tags && typeof req.body.tags === "string") {
    try {
      // Overwrite req.body.tags with the parsed JavaScript array
      req.body.tags = JSON.parse(req.body.tags);
    } catch (jsonError) {
      console.error("JSON Parsing Error for 'tags':", jsonError.message);
      return res
        .status(400)
        .json({
          msg: "Invalid format for tags array (must be a valid JSON string).",
        });
    }
  }

  // --- CRITICAL FIX 2: Get creator ID from JWT middleware ---
  // Safely retrieve the user ID, checking for both 'id' and '_id' which are common in JWT payloads.
  const creatorId = req.user?.id || req.user?._id;

  if (!creatorId) {
    // If the ID is not present in the token payload attached to req.user, return 401.
    return res
      .status(401)
      .json({
        msg: "Not Authorized: Creator ID (id or _id) not found in token.",
      });
  } // Deconstruct body fields (excluding 'creator' which comes from req.user)

  const {
    title,
    description,
    category,
    creatorName,
    tags, // This is now the parsed array (if parsing was successful)
  } = req.body; // Check if the file was uploaded successfully by the middleware

  if (!req.file) {
    return res.status(400).json({ msg: "Image file is required." });
  } // Extract data from the Multer/Cloudinary response (req.file)
  const assetPath = req.file.path; // Contains the secure_url from CloudinaryStorage
  const assetPublicId = req.file.filename; // Contains the public_id from CloudinaryStorage // Extract width and height to calculate aspect ratio
  const width = req.file.width;
  const height = req.file.height; // Calculate aspect ratio (Width / Height)
  const aspectRatio = width && height ? width / height : 1.0;

  try {
    const newProject = new Project({
      title,
      description,
      category,
      creatorName,
      creator: creatorId, // <-- NOW PULLING ID FROM AUTHENTICATION (id or _id)
      tags: Array.isArray(tags) ? tags : [], // Use the extracted Cloudinary data

      assetPath,
      assetPublicId,
      aspectRatio,
    });

    const project = await newProject.save();
    res.status(201).json(project); // 201 Created
  } catch (err) {
    console.error("Error during project save:", err.message);

    // --- IMPROVED ERROR HANDLING ---
    // 1. Handle Mongoose Validation Errors (400 Bad Request)
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      // Return specific validation messages to the client
      return res
        .status(400)
        .json({ msg: `Validation failed: ${messages.join(", ")}` });
    } // 2. OPTIONAL: Clean up the uploaded file from Cloudinary if DB save fails
    if (assetPublicId) {
      console.log(
        `DB save failed. Attempting to delete asset: ${assetPublicId}`
      );
      await cloudinary.uploader.destroy(assetPublicId).catch((deleteErr) => {
        console.error(
          "Failed to delete Cloudinary asset after DB error:",
          deleteErr
        );
      });
    } // 3. Fallback for true 500 server errors
    res.status(500).send("Server Error during project save");
  }
};

// ----------------------------------------------------------------------
// 4. DELETE project (Cloudinary Logic ADDED)
// ----------------------------------------------------------------------
// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    } // 1. Delete the asset from Cloudinary

    if (project.assetPublicId) {
      await cloudinary.uploader.destroy(project.assetPublicId);
      console.log(`Cloudinary asset deleted: ${project.assetPublicId}`);
    } // 2. Delete the document from MongoDB

    await project.deleteOne(); // Using deleteOne() on the fetched document

    res.status(200).json({ msg: "Project removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Project not found" });
    }
    res.status(500).send("Server Error");
  }
};

// ----------------------------------------------------------------------
// 5. UPDATE project (Placeholder)
// ----------------------------------------------------------------------
// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res) => {
  // You'd need to implement update logic here, including checking if a new file
  // was uploaded and if the old asset needs to be deleted from Cloudinary.
  res.status(501).json({ msg: "Update logic not yet implemented" });
};
