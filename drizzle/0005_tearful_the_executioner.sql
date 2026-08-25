CREATE TABLE `sys_file` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`path` varchar(500) NOT NULL,
	`mime` varchar(100) NOT NULL,
	`ext` varchar(20) NOT NULL,
	`size` int unsigned NOT NULL,
	`created_by` int unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_file_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_file_created_by` ON `sys_file` (`created_by`);