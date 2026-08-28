/**
 * lew-ui 类型补丁
 * 运行时已支持但 .d.ts 漏写的字段，通过声明合并补齐：
 * - LewTableColumn.customRender：表格列自定义渲染（运行时以 { row, column, text } 调用）
 * - LewDialogOptions.onOk / onClose：函数式弹窗确认/关闭回调（运行时已解构支持）
 */
import "lew-ui";

declare module "lew-ui" {
  interface LewTableColumn {
    customRender?: (ctx: {
      row: Record<string, unknown>;
      column: LewTableColumn;
      text: unknown;
    }) => unknown;
  }

  interface LewDialogOptions {
    onOk?: () => void | Promise<void>;
    onClose?: () => void;
  }
}

export {};
