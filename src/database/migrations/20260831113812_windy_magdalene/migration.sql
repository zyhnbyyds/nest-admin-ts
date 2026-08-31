CREATE TABLE `sys_role_dept` (
	`role_id` int unsigned NOT NULL,
	`dept_id` int unsigned NOT NULL,
	CONSTRAINT `uq_role_dept` UNIQUE INDEX(`role_id`,`dept_id`),
	CONSTRAINT `fk_role_dept_role` FOREIGN KEY (`role_id`) REFERENCES `sys_role`(`id`),
	CONSTRAINT `fk_role_dept_dept` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_role_dept_dept` ON `sys_role_dept` (`dept_id`);