import cron, { ScheduledTask } from "node-cron";
import logger from "../logger";
import { prisma } from "../prisma";
import { backupDatabase } from "./jobs/backupDatabase";
import { cleanupOldLogs } from "./jobs/cleanupLogs";
import { cleanupExpiredOTPs } from "./jobs/cleanupOTPs";
import { generateDailyReports } from "./jobs/generateReports";

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs(): void {
    logger.info("Initializing cron jobs...");

    // Cleanup expired OTPs - Every day at 00:00 (midnight)
    cron.schedule("0 0 * * *", async () => {
        logger.info("Running OTP cleanup job");
        try {
            await cleanupExpiredOTPs();
            logger.info("OTP cleanup job completed successfully");
        } catch (error) {
            logger.error("OTP cleanup job failed:", error);
        }
    });

    // Generate daily reports - Every day at 01:00 (1 AM)
    cron.schedule("0 1 * * *", async () => {
        logger.info("Running daily reports generation job");
        try {
            await generateDailyReports();
            logger.info("Daily reports generation completed successfully");
        } catch (error) {
            logger.error("Daily reports generation failed:", error);
        }
    });

    // Cleanup old logs - Every week on Sunday at 02:00 (2 AM)
    cron.schedule("0 2 * * 0", async () => {
        logger.info("Running log cleanup job");
        try {
            await cleanupOldLogs();
            logger.info("Log cleanup completed successfully");
        } catch (error) {
            logger.error("Log cleanup failed:", error);
        }
    });

    // Database backup - Every day at 03:00 (3 AM)
    cron.schedule("0 3 * * *", async () => {
        logger.info("Running database backup job");
        try {
            await backupDatabase();
            logger.info("Database backup completed successfully");
        } catch (error) {
            logger.error("Database backup failed:", error);
        }
    });

    // Cleanup inactive sessions - Every 6 hours
    cron.schedule("0 */6 * * *", async () => {
        logger.info("Running inactive session cleanup job");
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Clean up old OTPs and inactive records
            const deletedCount = await prisma.otp.deleteMany({
                where: {
                    createdAt: {
                        lt: thirtyDaysAgo,
                    },
                },
            });

            logger.info(
                `Cleaned up ${deletedCount.count} inactive session records`
            );
        } catch (error) {
            logger.error("Inactive session cleanup failed:", error);
        }
    });

    // Send reminder notifications - Every day at 09:00 (9 AM)
    cron.schedule("0 9 * * *", async () => {
        logger.info("Running reminder notifications job");
        try {
            // Get all bookings for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const bookings = await prisma.booking.findMany({
                where: {
                    date: {
                        gte: today,
                        lt: tomorrow,
                    },
                    status: "PENDING",
                },
                include: {
                    serviceDetails: true,
                },
            });

            logger.info(
                `Found ${bookings.length} bookings to send reminders for`
            );

            // Send reminders (integrate with your notification system)
            for (const booking of bookings) {
                await prisma.notifications.create({
                    data: {
                        receiverId: booking.userId,
                        title: "Booking Reminder",
                        body: `Your booking for ${booking.serviceDetails.name} is scheduled for today`,
                    },
                });
            }

            logger.info("Reminder notifications sent successfully");
        } catch (error) {
            logger.error("Reminder notifications failed:", error);
        }
    });

    logger.info("All cron jobs initialized successfully");
}

/**
 * Validate cron expression
 */
export function isValidCronExpression(expression: string): boolean {
    return cron.validate(expression);
}

/**
 * Schedule a custom cron job
 */
export function scheduleJob(
    expression: string,
    name: string,
    callback: () => Promise<void>
): ScheduledTask | null {
    if (!isValidCronExpression(expression)) {
        logger.error(`Invalid cron expression: ${expression}`);
        return null;
    }

    logger.info(`Scheduling custom job: ${name}`);
    return cron.schedule(expression, async () => {
        logger.info(`Running custom job: ${name}`);
        try {
            await callback();
            logger.info(`Custom job ${name} completed successfully`);
        } catch (error) {
            logger.error(`Custom job ${name} failed:`, error);
        }
    });
}
