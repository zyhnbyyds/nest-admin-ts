CREATE TABLE `ai_task_step` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`task_id` int unsigned NOT NULL,
	`step_index` int NOT NULL,
	`tool_name` varchar(100) NOT NULL,
	`input` json,
	`output` json,
	`status` enum('PENDING','RUNNING','SUCCESS','FAILED','SKIPPED','WAITING_APPROVAL') NOT NULL DEFAULT 'PENDING',
	`risk_level` varchar(10) NOT NULL,
	`error` varchar(1000),
	`started_at` timestamp,
	`completed_at` timestamp
);
--> statement-breakpoint
CREATE TABLE `ai_task` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`session_id` int unsigned,
	`user_id` int unsigned NOT NULL,
	`status` enum('PENDING','RUNNING','SUCCESS','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`risk_level` varchar(10) NOT NULL,
	`goal` varchar(500) NOT NULL,
	`error` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`started_at` timestamp,
	`completed_at` timestamp
);
--> statement-breakpoint
CREATE INDEX `idx_ai_task_step_task` ON `ai_task_step` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_task_session` ON `ai_task` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_task_user` ON `ai_task` (`user_id`);--> statement-breakpoint
ALTER TABLE `ai_task_step` ADD CONSTRAINT `fk_ai_task_step_task` FOREIGN KEY (`task_id`) REFERENCES `ai_task`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ai_task` ADD CONSTRAINT `fk_ai_task_session` FOREIGN KEY (`session_id`) REFERENCES `ai_session`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `ai_task` ADD CONSTRAINT `fk_ai_task_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE CASCADE;