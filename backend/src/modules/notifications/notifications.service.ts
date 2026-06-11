import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../database/entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async findByUser(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = this.notificationRepository.createQueryBuilder('notif')
      .where('notif.userId = :userId OR notif.userId IS NULL', { userId })
      .skip((p - 1) * l)
      .take(l)
      .orderBy('notif.createdAt', 'DESC');

    if (unreadOnly) {
      query.andWhere('notif.isRead = :isRead', { isRead: false });
    }

    const [notifications, total] = await query.getManyAndCount();

    return {
      data: notifications,
      meta: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    await this.notificationRepository.save(notification);

    return notification;
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );

    return { message: `Marked ${result.affected} notifications as read` };
  }

  async delete(notificationId: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.remove(notification);

    return { message: 'Notification deleted' };
  }

  async create(params: {
    userId?: string;
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: params.userId || null,
      title: params.title,
      message: params.message,
      type: params.type || NotificationType.INFO,
      link: params.link || null,
      isRead: false,
    } as any) as unknown as Notification;

    return this.notificationRepository.save(notification as any);
  }

  async broadcast(params: {
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
  }): Promise<Notification> {
    return this.create({ ...params, userId: undefined });
  }

  async sendDiscordWebhook(title: string, message: string, type: string = 'info') {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      this.logger.warn('Discord webhook URL not configured');
      return;
    }

    const colors: Record<string, number> = {
      info: 0x3498db,
      success: 0x2ecc71,
      warning: 0xf39c12,
      error: 0xe74c3c,
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title,
            description: message,
            color: colors[type] || colors.info,
            timestamp: new Date().toISOString(),
          }],
        }),
      });

      if (!response.ok) {
        this.logger.error(`Discord webhook failed: ${response.statusText}`);
      }
    } catch (err) {
      this.logger.error(`Discord webhook error: ${err.message}`);
    }
  }
}
