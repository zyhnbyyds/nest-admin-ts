CREATE TABLE `sys_post` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`post_key` varchar(100) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`remark` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `sys_post_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_post_key` UNIQUE(`post_key`)
);
--> statement-breakpoint
CREATE TABLE `sys_user_post` (
	`user_id` int unsigned NOT NULL,
	`post_id` int unsigned NOT NULL,
	CONSTRAINT `uq_user_post` UNIQUE(`user_id`,`post_id`)
);
