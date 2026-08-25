CREATE TABLE `sys_dept` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`parent_id` int unsigned NOT NULL DEFAULT 0,
	`ancestors` varchar(500) NOT NULL DEFAULT '0',
	`name` varchar(50) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`leader_user_id` int unsigned,
	`phone` varchar(20),
	`email` varchar(100),
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `sys_dept_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sys_dict_data` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`dict_type` varchar(100) NOT NULL,
	`label` varchar(100) NOT NULL,
	`value` varchar(100) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`css_class` varchar(100),
	`list_class` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `sys_dict_data_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_dict_type_value` UNIQUE(`dict_type`,`value`)
);
--> statement-breakpoint
CREATE TABLE `sys_menu` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`parent_id` int unsigned NOT NULL DEFAULT 0,
	`name` varchar(100) NOT NULL,
	`title` varchar(100) NOT NULL,
	`type` enum('M','C','F') NOT NULL,
	`path` varchar(255),
	`component` varchar(255),
	`permission` varchar(255),
	`icon` varchar(100),
	`sort` int NOT NULL DEFAULT 0,
	`visible` boolean NOT NULL DEFAULT true,
	`cacheable` boolean NOT NULL DEFAULT false,
	`external` boolean NOT NULL DEFAULT false,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `sys_menu_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_menu_permission` UNIQUE(`permission`)
);
--> statement-breakpoint
CREATE TABLE `sys_operation_log` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned,
	`title` varchar(100) NOT NULL,
	`business_type` varchar(50) NOT NULL,
	`method` varchar(255) NOT NULL,
	`request_method` varchar(10) NOT NULL,
	`url` varchar(500) NOT NULL,
	`ip` varchar(45),
	`request_body` json,
	`response_body` json,
	`status` enum('success','failure') NOT NULL,
	`error_message` varchar(2000),
	`duration_ms` int unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_operation_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sys_refresh_token` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int unsigned NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`revoked_at` datetime,
	`device` varchar(255),
	`ip` varchar(45),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sys_refresh_token_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_refresh_token_hash` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `sys_role_menu` (
	`role_id` int unsigned NOT NULL,
	`menu_id` int unsigned NOT NULL,
	CONSTRAINT `uq_role_menu` UNIQUE(`role_id`,`menu_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_role` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`role_key` varchar(100) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`data_scope` enum('all','custom','dept','dept_and_children','self') NOT NULL DEFAULT 'all',
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`is_system` boolean NOT NULL DEFAULT false,
	`remark` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `sys_role_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_role_key` UNIQUE(`role_key`)
);
--> statement-breakpoint
CREATE TABLE `sys_user_role` (
	`user_id` int unsigned NOT NULL,
	`role_id` int unsigned NOT NULL,
	CONSTRAINT `uq_user_role` UNIQUE(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_user` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`dept_id` int unsigned,
	`username` varchar(64) NOT NULL,
	`display_name` varchar(64) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`email` varchar(100),
	`phone` varchar(20),
	`avatar` varchar(500),
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`login_at` datetime,
	`login_ip` varchar(45),
	`password_changed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `sys_user_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_user_username` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `idx_dept_parent` ON `sys_dept` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_menu_parent` ON `sys_menu` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_refresh_user` ON `sys_refresh_token` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_dept` ON `sys_user` (`dept_id`);