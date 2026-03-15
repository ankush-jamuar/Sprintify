import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Notification from '../models/notification.model';

export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    // Fetch unread notifications, limit to 50
    const notifications = await Notification.find({
      recipientId: userId
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching notifications', error });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?._id;

    const notif = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notif) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.status(200).json(notif);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating notification', error });
  }
};

export const markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error marking all notifications as read', error });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?._id;

    const notif = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId
    });

    if (!notif) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting notification', error });
  }
};
