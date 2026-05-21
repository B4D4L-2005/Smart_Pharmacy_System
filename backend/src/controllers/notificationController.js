import { db } from '../services/db.js';

export async function getNotifications(req, res) {
  try {
    const { status } = req.query;
    let notifications = await db.notifications.raw();

    if (status) {
      notifications = notifications.filter(n => n.status === status);
    }

    // Sort by newest first
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving notifications.', error: error.message });
  }
}

export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const notification = await db.notifications.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    const updated = await db.notifications.update(id, { status: 'read' });
    res.json({ message: 'Notification marked as read.', notification: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification.', error: error.message });
  }
}

export async function markAllAsRead(req, res) {
  try {
    const notifications = await db.notifications.raw();
    const unread = notifications.filter(n => n.status === 'unread');
    
    for (const item of unread) {
      await db.notifications.update(item.id, { status: 'read' });
    }

    res.json({ message: 'All notifications marked as read.', count: unread.length });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications.', error: error.message });
  }
}

export async function deleteNotification(req, res) {
  try {
    const deleted = await db.notifications.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    res.json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification.', error: error.message });
  }
}

export async function clearAllNotifications(req, res) {
  try {
    await db.notifications.saveAll([]);
    res.json({ message: 'Notification history cleared successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing notifications.', error: error.message });
  }
}
