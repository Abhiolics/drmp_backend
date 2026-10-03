const Contact = require('../models/Contact');

// @desc    Get all active contacts (Public/User)
// @route   GET /api/contacts or /contacts
// @access  Public
exports.getContacts = async (req, res, next) => {
  try {
    const contacts = await Contact.find({ isActive: true }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contacts (Admin)
// @route   GET /api/admin/contacts or /admin/contacts
// @access  Private/Admin
exports.getAllContactsAdmin = async (req, res, next) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add contact
// @route   POST /api/admin/contacts or /admin/contacts
// @access  Private/Admin
exports.addContact = async (req, res, next) => {
  try {
    const { type, label, value } = req.body;

    if (!type || !label || !value) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type, label, and value for the contact',
      });
    }

    const contact = await Contact.create({
      type,
      label,
      value,
    });

    res.status(201).json({
      success: true,
      message: 'Contact added successfully',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contact
// @route   PUT /api/admin/contacts/:id or /admin/contacts/:id
// @access  Private/Admin
exports.updateContact = async (req, res, next) => {
  try {
    let contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    contact = await Contact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contact
// @route   DELETE /api/admin/contacts/:id or /admin/contacts/:id
// @access  Private/Admin
exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    await contact.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
