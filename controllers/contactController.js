  import Contact from "../models/Contact.js";
  export async function upsertContact(req, res) {
    try {
      const { sessionId, name, email } = req.body;
      const contact = await Contact.findOneAndUpdate(
        { sessionId },
        { name, email, lastActive: Date.now() },
        { upsert: true, new: true }
      );
      res.json(contact);
    } catch (err) {
      next(err);
    }

  }

  export async function listContacts(req, res) {
    try {
      const contacts = await Contact.find().sort({ lastActive: -1 });
      res.json(contacts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
