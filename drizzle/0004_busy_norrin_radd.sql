CREATE TABLE `sys_job_log` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`job_id` int unsigned NOT NULL,
	`job_name` varchar(100) NOT NULL,
	`handler` varchar(255) NOT NULL,
	`status` enum('success','failure') NOT NULL,
	`message` varchar(2000),
	`started_at` timestamp NOT NULL,
	`finished_at` timestamp NOT NULL,
	`duration_ms` int unsigned NOT NULL,
	CONSTRAINT `sys_job_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sys_job` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`handler` varchar(255) NOT NULL,
	`cron` varchar(100) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`concurrent` boolean NOT NULL DEFAULT true,
	`remark` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `sys_job_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_job_handler` UNIQUE(`handler`)
);
--> statement-breakpoint
CREATE INDEX `idx_job_log_job` ON `sys_job_log` (`job_id`);