CREATE TABLE `sys_config` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(100) NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`value` varchar(500) NOT NULL,
	`builtin` boolean NOT NULL DEFAULT false,
	`remark` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `uq_config_key` UNIQUE INDEX(`config_key`)
);
--> statement-breakpoint
CREATE TABLE `sys_dept` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`parent_id` int unsigned NOT NULL DEFAULT 0,
	`ancestors` varchar(500) NOT NULL DEFAULT '0',
	`name` varchar(50) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`leader_user_id` int unsigned,
	`phone` varchar(20),
	`email` varchar(100),
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned
);
--> statement-breakpoint
CREATE TABLE `sys_dict_type` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(100) NOT NULL,
	`type` varchar(100) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`remark` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `uq_dict_type` UNIQUE INDEX(`type`)
);
--> statement-breakpoint
CREATE TABLE `sys_dict_data` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`dict_type` varchar(100) NOT NULL,
	`label` varchar(100) NOT NULL,
	`value` varchar(100) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`css_class` varchar(100),
	`list_class` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `uq_dict_type_value` UNIQUE INDEX(`dict_type`,`value`)
);
--> statement-breakpoint
CREATE TABLE `sys_file` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`path` varchar(500) NOT NULL,
	`mime` varchar(100) NOT NULL,
	`ext` varchar(20) NOT NULL,
	`size` int unsigned NOT NULL,
	`created_by` int unsigned,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sys_job_log` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`job_id` int unsigned NOT NULL,
	`job_name` varchar(100) NOT NULL,
	`handler` varchar(255) NOT NULL,
	`status` enum('success','failure') NOT NULL,
	`message` varchar(2000),
	`started_at` timestamp NOT NULL,
	`finished_at` timestamp NOT NULL,
	`duration_ms` int unsigned NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sys_job` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(100) NOT NULL,
	`handler` varchar(255) NOT NULL,
	`cron` varchar(100) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`concurrent` boolean NOT NULL DEFAULT true,
	`remark` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `uq_job_handler` UNIQUE INDEX(`handler`)
);
--> statement-breakpoint
CREATE TABLE `sys_login_log` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`user_id` int unsigned,
	`username` varchar(64) NOT NULL,
	`ip` varchar(45),
	`user_agent` varchar(500),
	`status` enum('success','failure') NOT NULL,
	`message` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sys_menu` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
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
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `uq_menu_permission` UNIQUE INDEX(`permission`)
);
--> statement-breakpoint
CREATE TABLE `sys_operation_log` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
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
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sys_post` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(50) NOT NULL,
	`post_key` varchar(100) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`remark` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `uq_post_key` UNIQUE INDEX(`post_key`)
);
--> statement-breakpoint
CREATE TABLE `sys_refresh_token` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`user_id` int unsigned NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`revoked_at` datetime,
	`device` varchar(255),
	`ip` varchar(45),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `uq_refresh_token_hash` UNIQUE INDEX(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `sys_role_dept` (
	`role_id` int unsigned NOT NULL,
	`dept_id` int unsigned NOT NULL,
	CONSTRAINT `uq_role_dept` UNIQUE INDEX(`role_id`,`dept_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_role_menu` (
	`role_id` int unsigned NOT NULL,
	`menu_id` int unsigned NOT NULL,
	CONSTRAINT `uq_role_menu` UNIQUE INDEX(`role_id`,`menu_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_role` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(50) NOT NULL,
	`role_key` varchar(100) NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`data_scope` enum('all','custom','dept','dept_and_children','self') NOT NULL DEFAULT 'all',
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`is_system` boolean NOT NULL DEFAULT false,
	`remark` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `uq_role_key` UNIQUE INDEX(`role_key`)
);
--> statement-breakpoint
CREATE TABLE `sys_user_post` (
	`user_id` int unsigned NOT NULL,
	`post_id` int unsigned NOT NULL,
	CONSTRAINT `uq_user_post` UNIQUE INDEX(`user_id`,`post_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_user_role` (
	`user_id` int unsigned NOT NULL,
	`role_id` int unsigned NOT NULL,
	CONSTRAINT `uq_user_role` UNIQUE INDEX(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `sys_user` (
	`id` int unsigned AUTO_INCREMENT PRIMARY KEY,
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
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` datetime,
	`created_by` int unsigned,
	`updated_by` int unsigned,
	CONSTRAINT `uq_user_username` UNIQUE INDEX(`username`)
);
--> statement-breakpoint
CREATE INDEX `idx_dept_parent` ON `sys_dept` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_file_created_by` ON `sys_file` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_job_log_job` ON `sys_job_log` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_login_log_user` ON `sys_login_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_login_log_time` ON `sys_login_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_menu_parent` ON `sys_menu` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_operation_log_user_time` ON `sys_operation_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_refresh_user` ON `sys_refresh_token` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_role_dept_dept` ON `sys_role_dept` (`dept_id`);--> statement-breakpoint
CREATE INDEX `idx_role_menu_menu` ON `sys_role_menu` (`menu_id`);--> statement-breakpoint
CREATE INDEX `idx_user_post_post` ON `sys_user_post` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_user_role_role` ON `sys_user_role` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_user_dept` ON `sys_user` (`dept_id`);--> statement-breakpoint
ALTER TABLE `sys_file` ADD CONSTRAINT `fk_file_created_by` FOREIGN KEY (`created_by`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `sys_job_log` ADD CONSTRAINT `fk_job_log_job` FOREIGN KEY (`job_id`) REFERENCES `sys_job`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sys_login_log` ADD CONSTRAINT `fk_login_log_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `sys_operation_log` ADD CONSTRAINT `fk_operation_log_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `sys_refresh_token` ADD CONSTRAINT `fk_refresh_token_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sys_role_dept` ADD CONSTRAINT `fk_role_dept_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sys_role_dept` ADD CONSTRAINT `fk_role_dept_dept` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sys_role_menu` ADD CONSTRAINT `fk_role_menu_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sys_role_menu` ADD CONSTRAINT `fk_role_menu_menu` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sys_user_post` ADD CONSTRAINT `fk_user_post_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sys_user_post` ADD CONSTRAINT `fk_user_post_post` FOREIGN KEY (`post_id`) REFERENCES `sys_post`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sys_user_role` ADD CONSTRAINT `fk_user_role_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sys_user_role` ADD CONSTRAINT `fk_user_role_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `sys_user` ADD CONSTRAINT `fk_user_dept` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept`(`id`) ON DELETE SET NULL;