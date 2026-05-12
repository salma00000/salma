"use strict";

const router = require("express").Router();
const savFoldersController = require("../controllers/savFoldersController");

router.post("/folders", savFoldersController.create);
router.get("/folders", savFoldersController.list);
router.get("/folders/:folder_reference", savFoldersController.getById);
router.patch("/folders/:folder_reference", savFoldersController.updateStatus);

module.exports = router;
