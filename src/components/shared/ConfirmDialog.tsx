import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  comment,
  onCommentChange,
  commentRequired,
  commentPlaceholder,
  onConfirm,
  busy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger' | 'teal'
  comment?: string
  onCommentChange?: (v: string) => void
  commentRequired?: boolean
  commentPlaceholder?: string
  onConfirm: () => void
  busy?: boolean
}) {
  const disabled = Boolean(commentRequired && !comment?.trim()) || busy

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-muted">{description}</p>}
        {onCommentChange && (
          <Textarea
            className="mt-2"
            placeholder={commentPlaceholder ?? 'Comment'}
            value={comment ?? ''}
            onChange={(e) => onCommentChange(e.target.value)}
          />
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'danger' : tone === 'teal' ? 'teal' : 'default'}
            disabled={disabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
