const express = require("express");
const router = express.Router();
const { body, validationResult } = require('express-validator');
const userdata = require("../middleware/auth")
const {fetchAllNotes,createNewNote} = require("../controller/notesController")


router.get('/fetchallnotes',userdata,fetchAllNotes)
router.get('/addNote',[
    body('title').notEmpty().withMessage('Title is required'),

    body('description').notEmpty().withMessage('Description is required'),


    body('tag').optional().isString().withMessage('Tag should be a valid string'),

  ],userdata,createNewNote)

module.exports = router;