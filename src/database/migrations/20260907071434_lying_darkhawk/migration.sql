CREATE TABLE `ai_audit_log` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`user_id` int unsigned,
	`session_id` int unsigned,
	`action` varchar(100) NOT NULL,
	`tool_name` varchar(100),
	`risk_level` varchar(10),
	`permission` varchar(100),
	`scope` varchar(100),
	`result` enum('allowed','denied','error') NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ai_message` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`session_id` int unsigned NOT NULL,
	`role` enum('user','assistant','tool','system') NOT NULL,
	`content` text,
	`tool_calls` json,
	`tool_results` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ai_session` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`user_id` int unsigned NOT NULL,
	`title` varchar(200) NOT NULL,
	`status` enum('active','closed') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_ai_audit_user` ON `ai_audit_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_audit_session` ON `ai_audit_log` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_audit_time` ON `ai_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_ai_message_session` ON `ai_message` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_session_user` ON `ai_session` (`user_id`);--> statement-breakpoint
ALTER TABLE `ai_message` ADD CONSTRAINT `fk_ai_message_session` FOREIGN KEY (`session_id`) REFERENCES `ai_session`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ai_session` ADD CONSTRAINT `fk_ai_session_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE CASCADE;