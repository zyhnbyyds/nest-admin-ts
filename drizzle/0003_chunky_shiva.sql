CREATE TABLE `sys_login_log` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned,
	`username` varchar(64) NOT NULL,
	`ip` varchar(45),
	`user_agent` varchar(500),
	`status` enum('success','failure') NOT NULL,
	`message` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_login_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_login_log_user` ON `sys_login_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_login_log_time` ON `sys_login_log` (`created_at`);