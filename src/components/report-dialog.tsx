"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

type User = { id: string; name: string; avatar: string }

interface ReportDialogProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportDialog({ user, open, onOpenChange }: ReportDialogProps) {
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Please select a reason for the report.",
        })
        return
    }

    console.log("Report submitted:", { user, reason, details })

    toast({
      title: "Report Submitted",
      description: `Your report against ${user.name} has been received.`,
    })

    setReason("")
    setDetails("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Report {user.name}</DialogTitle>
            <DialogDescription>
              Help us keep the community safe. Please provide details about the issue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <RadioGroup onValueChange={setReason} value={reason}>
              <Label className="mb-2">Reason for reporting</Label>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="harassment" id="r1" />
                <Label htmlFor="r1">Harassment or Hate Speech</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inappropriate-content" id="r2" />
                <Label htmlFor="r2">Inappropriate Content</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="r3" />
                <Label htmlFor="r3">Spam or Scams</Label>
              </div>
               <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="r4" />
                <Label htmlFor="r4">Other</Label>
              </div>
            </RadioGroup>
            <Textarea
              placeholder="Provide additional details (optional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Report</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
