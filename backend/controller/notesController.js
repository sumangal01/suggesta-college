const userdata = require("../middleware/auth");
const notes = require("../models/notes");

const Notes = require("../models/notes")
const { body, validationResult } = require('express-validator');

async function fetchAllNotes(req,res){
  try {
    const notes = await Notes.find({user : req.user.id});
    res.json(notes) 
  } catch (error) {
    console.error(error.message);
    res.status(401).send("Internal Server Error")
  }
    
}

async function createNewNote(req,res){ 
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user, title, description, tag } = req.body;
     
    const newNote = new Notes({
        user: req.user.id,
        title,
        description,
        tag: tag || "General", 
        
      });
    const savedNote = await newNote.save()
    res.json(savedNote)
  } catch (error) {
    console.error(error.message);
    res.status(401).send("Internal Server Error")
  }
   
}
module.exports = {
    fetchAllNotes,
    createNewNote
}