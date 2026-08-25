CREATE TABLE `sys_config` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`value` varchar(500) NOT NULL,
	`builtin` boolean NOT NULL DEFAULT false,
	`remark` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `sys_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_config_key` UNIQUE(`config_key`)
);
--> statement-breakpoint
CREATE TABLE `sys_dict_type` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` varchar(100) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`remark` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `sys_dict_type_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_dict_type` UNIQUE(`type`)
);
