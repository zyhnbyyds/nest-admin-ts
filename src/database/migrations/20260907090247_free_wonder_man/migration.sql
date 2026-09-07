CREATE TABLE `ai_action_intent` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`session_id` int unsigned,
	`user_id` int unsigned NOT NULL,
	`tool_name` varchar(100) NOT NULL,
	`input` json,
	`input_hash` varchar(64) NOT NULL,
	`before_hash` varchar(64),
	`confirm_token` varchar(128),
	`risk_level` varchar(10) NOT NULL,
	`status` enum('PENDING','APPROVED','REJECTED','EXPIRED','EXECUTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`expires_at` datetime NOT NULL,
	`executed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ai_approval` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`action_intent_id` int unsigned NOT NULL,
	`approver_id` int unsigned NOT NULL,
	`status` enum('APPROVED','REJECTED') NOT NULL,
	`reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_ai_action_intent_user` ON `ai_action_intent` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_action_intent_status` ON `ai_action_intent` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_action_intent_token` ON `ai_action_intent` (`confirm_token`);--> statement-breakpoint
CREATE INDEX `idx_ai_approval_intent` ON `ai_approval` (`action_intent_id`);--> statement-breakpoint
ALTER TABLE `ai_action_intent` ADD CONSTRAINT `fk_ai_action_intent_session` FOREIGN KEY (`session_id`) REFERENCES `ai_session`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `ai_action_intent` ADD CONSTRAINT `fk_ai_action_intent_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ai_approval` ADD CONSTRAINT `fk_ai_approval_intent` FOREIGN KEY (`action_intent_id`) REFERENCES `ai_action_intent`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `ai_approval` ADD CONSTRAINT `fk_ai_approval_approver` FOREIGN KEY (`approver_id`) REFERENCES `sys_user`(`id`) ON DELETE CASCADE;