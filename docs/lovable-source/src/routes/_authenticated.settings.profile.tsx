import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, GlassCard, SectionHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { logSettings } from "@/lib/settings-audit";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  head: () => ({ meta: [{ title: "Profile — SmartLibrary" }] }),
  component: ProfilePage,
});

const INITIAL = {
  fullName: "Aarav Mehta",
  email: "aarav@meridian.edu",
  phone: "+91 98765 43210",
  title: "Head Librarian",
  bio: "Curating Meridian's reference collection since 2019.",
  language: "en-IN",
  timezone: "Asia/Kolkata",
  weekStart: "Mon",
  marketingOptIn: false,
};

function ProfilePage() {
  const [form, setForm] = useState(INITIAL);
  const [saved, setSaved] = useState(INITIAL);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const initials = form.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("");

  function save() {
    if (!form.fullName.trim()) return toast.error("Full name is required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return toast.error("Invalid email");
    setSaved(form);
    logSettings("Profile", "Updated profile details");
    toast.success("Profile saved");
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Personal information shown to colleagues and on receipts."
      />
      <GlassCard className="p-6 space-y-6">
        <SectionHeader title="Identity" description="How others see you in the workspace." />
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="" alt={form.fullName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Upload new</Button>
            <Button variant="ghost" size="sm">Remove</Button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Full name</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Job title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1.5 md:col-span-2"><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-5">
        <SectionHeader title="Localization" />
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en-IN">English (India)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="hi-IN">Hindi</SelectItem>
                <SelectItem value="es-ES">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Time zone</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">America/New_York</SelectItem>
                <SelectItem value="Europe/London">Europe/London</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Week starts on</Label>
            <Select value={form.weekStart} onValueChange={(v) => setForm({ ...form, weekStart: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mon">Monday</SelectItem>
                <SelectItem value="Sun">Sunday</SelectItem>
                <SelectItem value="Sat">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-5">
        <SectionHeader title="Preferences" />
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Product update emails</p>
            <p className="text-xs text-muted-foreground">Occasional summaries of new SmartLibrary features.</p>
          </div>
          <Switch checked={form.marketingOptIn} onCheckedChange={(v) => setForm({ ...form, marketingOptIn: v })} />
        </div>
      </GlassCard>

      <SaveBar dirty={dirty} onCancel={() => setForm(saved)} onSave={save} />
    </>
  );
}

function SaveBar({ dirty, onSave, onCancel }: { dirty: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className={`sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-xl border bg-background/80 backdrop-blur p-3 shadow-elegant transition-opacity ${dirty ? "opacity-100" : "opacity-60"}`}>
      <span className="text-xs text-muted-foreground mr-auto">{dirty ? "Unsaved changes" : "All changes saved"}</span>
      <Button variant="ghost" size="sm" disabled={!dirty} onClick={onCancel}>Cancel</Button>
      <Button size="sm" disabled={!dirty} onClick={onSave}>Save changes</Button>
    </div>
  );
}
