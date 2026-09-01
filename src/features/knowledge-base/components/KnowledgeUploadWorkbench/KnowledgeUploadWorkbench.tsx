import { AlertCircle, ArrowUp, CheckCheck, Files } from 'lucide-react'

import styles from './KnowledgeUploadWorkbench.module.scss'
import { UploadDropzone } from '../UploadDropzone/UploadDropzone'
import { UploadQueue } from '../UploadQueue/UploadQueue'

import type { KnowledgeUploadController } from '../../hooks/useKnowledgeUpload'

interface KnowledgeUploadWorkbenchProps {
  readonly controller: KnowledgeUploadController
}

// 组合文件选择、校验反馈和上传队列，保持业务状态集中在调用方 Hook。
export function KnowledgeUploadWorkbench({ controller }: KnowledgeUploadWorkbenchProps) {
  const completedCount = controller.items.filter((item) => item.status === 'success').length
  const hasCompleted = controller.items.some(
    (item) => item.status === 'success' || item.status === 'canceled',
  )

  return (
    <section className={styles.workbench} aria-labelledby="upload-heading">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>UPLOAD WORKSPACE</span>
          <h2 id="upload-heading">添加知识文件</h2>
        </div>
        <div className={styles.summary} aria-live="polite">
          <Files size={16} aria-hidden="true" />
          {controller.items.length}/10 个文件
          {completedCount > 0 ? <span>· {completedCount} 个已提交</span> : null}
        </div>
      </div>

      <UploadDropzone disabled={controller.isUploading} onFilesSelected={controller.addFiles} />

      {controller.rejections.length > 0 ? (
        <div className={styles.validationNotice} role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>部分文件未加入队列</strong>
            <ul>
              {controller.rejections.map((rejection) => (
                <li key={`${rejection.fileName}-${rejection.reason}`}>
                  {rejection.fileName}：{rejection.reason}
                </li>
              ))}
            </ul>
          </div>
          <button type="button" onClick={controller.clearRejections}>
            知道了
          </button>
        </div>
      ) : null}

      {controller.items.length > 0 ? (
        <div className={styles.queueSection}>
          <div className={styles.queueHeading}>
            <h3>本批文件</h3>
            {hasCompleted ? (
              <button type="button" onClick={controller.clearCompleted}>
                <CheckCheck size={16} aria-hidden="true" />
                清理已完成
              </button>
            ) : null}
          </div>
          <UploadQueue
            items={controller.items}
            onCancel={controller.cancelItem}
            onRemove={controller.removeItem}
            onRetry={controller.retryItem}
          />
          <div className={styles.footer}>
            <p>上传成功表示文件已交给后端，解析与向量化将在服务端继续进行。</p>
            <button
              type="button"
              className={styles.uploadButton}
              disabled={!controller.canStart}
              onClick={controller.startUpload}
            >
              <ArrowUp size={17} aria-hidden="true" />
              {controller.isUploading ? '正在上传…' : '开始上传'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
