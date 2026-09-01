import { useEffect } from 'react'
import { Modal } from 'antd'
import { ArrowLeft, Blocks, FileSearch, Sparkles, UploadCloud } from 'lucide-react'
import { useBlocker, useNavigate } from 'react-router'

import styles from './KnowledgeBasePage.module.scss'

import { KnowledgeUploadWorkbench, useKnowledgeUpload } from '@/features/knowledge-base'
import { APP_ROUTES } from '@/shared/config'

const PROCESS_STEPS = [
  { icon: UploadCloud, title: '安全上传', description: '文件逐个提交，状态清晰可追踪' },
  { icon: FileSearch, title: '内容解析', description: '后端抽取文档正文与结构信息' },
  { icon: Blocks, title: '向量入库', description: '生成向量索引，为问答提供知识' },
] as const

function hasPreviousAppEntry(): boolean {
  const state: unknown = window.history.state
  return (
    typeof state === 'object' &&
    state !== null &&
    'idx' in state &&
    typeof state.idx === 'number' &&
    state.idx > 0
  )
}

// 提供知识库上传页面，并在文件传输期间保护用户免于误离开。
export function KnowledgeBasePage() {
  const controller = useKnowledgeUpload()
  const { cancelAll, isUploading } = controller
  const navigate = useNavigate()
  const blocker = useBlocker(isUploading)
  const [modal, modalContextHolder] = Modal.useModal()

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const instance = modal.confirm({
      title: '上传尚未完成',
      content: '离开页面会中断正在上传的文件，确定要离开吗？',
      okText: '中断并离开',
      cancelText: '继续上传',
      okButtonProps: { danger: true },
      onOk: () => {
        cancelAll()
        blocker.proceed()
      },
      onCancel: () => blocker.reset(),
    })
    return () => instance.destroy()
  }, [blocker, cancelAll, modal])

  useEffect(() => {
    if (!isUploading) return
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isUploading])

  const handleBack = (): void => {
    if (hasPreviousAppEntry()) {
      void navigate(-1)
      return
    }
    void navigate(APP_ROUTES.home)
  }

  return (
    <div className={styles.page}>
      {modalContextHolder}
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          返回聊天
        </button>
        <div className={styles.brandMark} aria-label="泰智汇知识库">
          <Sparkles size={16} aria-hidden="true" />
          Tazhive Knowledge
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.badge}>
            <span /> AI KNOWLEDGE BASE
          </span>
          <h1>让每份资料，成为 AI 的可靠知识</h1>
          <p>上传业务文档，系统会在后端自动解析、向量化并存入知识库。</p>
        </section>

        <div className={styles.workspaceGrid}>
          <KnowledgeUploadWorkbench controller={controller} />
          <aside className={styles.guide} aria-labelledby="process-heading">
            <div className={styles.guideHeading}>
              <span className={styles.guideIcon}>
                <Sparkles size={18} aria-hidden="true" />
              </span>
              <div>
                <span>处理流程</span>
                <h2 id="process-heading">从文件到知识</h2>
              </div>
            </div>
            <ol>
              {PROCESS_STEPS.map((step, index) => {
                const Icon = step.icon
                return (
                  <li key={step.title}>
                    <span className={styles.stepIcon}>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                    </div>
                    <span className={styles.stepNumber}>0{index + 1}</span>
                  </li>
                )
              })}
            </ol>
            <div className={styles.privacyNote}>
              <strong>文件仅用于知识构建</strong>
              <p>上传前请确认你拥有相关资料的使用权限，并避免包含非必要的敏感信息。</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
