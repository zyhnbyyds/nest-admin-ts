ALTER TABLE `ai_action_intent` ADD `task_id` int unsigned;--> statement-breakpoint
ALTER TABLE `ai_action_intent` ADD `task_step_id` int unsigned;--> statement-breakpoint
ALTER TABLE `ai_action_intent` ADD CONSTRAINT `fk_ai_action_intent_task` FOREIGN KEY (`task_id`) REFERENCES `ai_task`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `ai_action_intent` ADD CONSTRAINT `fk_ai_action_intent_task_step` FOREIGN KEY (`task_step_id`) REFERENCES `ai_task_step`(`id`) ON DELETE SET NULL;