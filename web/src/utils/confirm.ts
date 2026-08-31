import { LewDialog } from "lew-ui";

/**
 * 危险/确认操作弹窗（删除、清空、手动执行等）。
 *
 * 注意：当前安装的 lew-ui 版本的 LewDialog.warning()/normal() 等方法
 * 不支持 onOk 回调（类型定义 LewDialogOptions 中只有 footerButtons），
 * 传 onOk 会被忽略，导致点确认后不执行任何动作、接口不被调用。
 * 这里改用 footerButtons 的确认按钮 request 触发回调，保证动作真正执行。
 */
export function confirmDanger(opts: {
  title: string;
  content: string;
  /** 弹窗类型，默认 warning（删除/清空），手动执行等可用 normal */
  type?: "warning" | "normal" | "info" | "error" | "success";
  confirmText?: string;
  /** 确认按钮颜色，默认 error；手动执行等可用 primary */
  confirmColor?: "error" | "primary" | "warning" | "success" | "info" | "gray";
  onConfirm: () => Promise<void> | void;
}) {
  const method = (opts.type ?? "warning") as "warning" | "normal";
  LewDialog[method]({
    title: opts.title,
    content: opts.content,
    footerButtons: [
      {
        props: { text: "取消", type: "text", color: "gray", size: "small" },
      },
      {
        props: {
          text: opts.confirmText ?? "删除",
          type: "fill",
          color: opts.confirmColor ?? "error",
          size: "small",
          request: async () => {
            await opts.onConfirm();
          },
        },
      },
    ],
  });
}
