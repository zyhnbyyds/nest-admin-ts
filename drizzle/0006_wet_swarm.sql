ALTER TABLE `sys_file` ADD CONSTRAINT `fk_file_created_by` FOREIGN KEY (`created_by`) REFERENCES `sys_user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_job_log` ADD CONSTRAINT `fk_job_log_job` FOREIGN KEY (`job_id`) REFERENCES `sys_job`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_login_log` ADD CONSTRAINT `fk_login_log_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_operation_log` ADD CONSTRAINT `fk_operation_log_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_refresh_token` ADD CONSTRAINT `fk_refresh_token_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_role_menu` ADD CONSTRAINT `fk_role_menu_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_role_menu` ADD CONSTRAINT `fk_role_menu_menu` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_user_post` ADD CONSTRAINT `fk_user_post_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_user_post` ADD CONSTRAINT `fk_user_post_post` FOREIGN KEY (`post_id`) REFERENCES `sys_post`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_user_role` ADD CONSTRAINT `fk_user_role_user` FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_user_role` ADD CONSTRAINT `fk_user_role_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sys_user` ADD CONSTRAINT `fk_user_dept` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_operation_log_user_time` ON `sys_operation_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_role_menu_menu` ON `sys_role_menu` (`menu_id`);--> statement-breakpoint
CREATE INDEX `idx_user_post_post` ON `sys_user_post` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_user_role_role` ON `sys_user_role` (`role_id`);