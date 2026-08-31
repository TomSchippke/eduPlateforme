"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  BookOpen,
  Users,
  FileText,
  Upload,
  Plus,
  Calendar,
  Bell,
  ClipboardList,
  ArrowLeft,
  Trash2,
  UserPlus,
  UserMinus,
  RefreshCw,
  MessageCircle,
  Pencil,
  BarChart,
} from "lucide-react";
import Link from "next/link";
import { GroupeStats } from "./groupe-stats";

// Simplified types for the component
interface GroupeDetailProps {
  groupe: {
    id: string;
    name: string;
    schoolYear: string;
    isArchived: boolean;
    chapitres: Array<{
      id: string;
      title: string;
      order: number;
        documents: Array<{
          id: string;
          fileName: string;
          fileType: string;
          indexStatus: string;
          indexError: string | null;
          fileSize: number | null;
          visibility: string;
          docType: string;
          keywords: string[];
          createdAt: string;
        }>;
    }>;
    memberships: Array<{
      id: string;
      eleve: {
        id: string;
        firstName: string;
        lastName: string;
        identifiant: string;
        isActive: boolean;
      };
    }>;
    annonces: Array<{
      id: string;
      title: string;
      content: string;
      publishedAt: string;
    }>;
    cours: Array<{
      id: string;
      title: string;
      dateTime: string;
      endTime: string | null;
      room: string | null;
      isCancelled: boolean;
      isException: boolean;
      isDS: boolean;
    }>;
    coursTemplates: Array<{
      id: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      room: string | null;
    }>;
    datesDS: Array<{
      id: string;
      title: string;
      date: string;
      keywords: string[];
      chapitres: Array<{ chapitre: { id: string; title: string } }>;
    }>;
  };
  allEleves: Array<{
    id: string;
    firstName: string;
    lastName: string;
    identifiant: string;
  }>;
}

type TabId = "chapitres" | "eleves" | "annonces" | "templates" | "edt" | "ds" | "stats";

export function GroupeDetail({ groupe, allEleves }: GroupeDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("chapitres");
  const [showAddChapitre, setShowAddChapitre] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState<{chapitreId: string, open: boolean}>({chapitreId: "", open: false});
  const [showAddAnnonce, setShowAddAnnonce] = useState(false);
  const [showAddCours, setShowAddCours] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showAddEleve, setShowAddEleve] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editDoc, setEditDoc] = useState<any>(null);
  const [editDS, setEditDS] = useState<any>(null);
  const [editGroupe, setEditGroupe] = useState(false);
  const [editChapitre, setEditChapitre] = useState<any>(null);
  const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "chapitres", label: "Chapitres", icon: BookOpen, count: groupe.chapitres.length },
    { id: "eleves", label: "Élèves", icon: Users, count: groupe.memberships.length },
    { id: "annonces", label: "Annonces", icon: Bell, count: groupe.annonces.length },
    { id: "templates", label: "EDT Récurrent", icon: RefreshCw, count: groupe.coursTemplates.length },
    { id: "edt", label: "EDT", icon: Calendar, count: groupe.cours.length },
    { id: "ds", label: "DS / Évals", icon: ClipboardList, count: groupe.datesDS.length },
    { id: "stats", label: "Statistiques", icon: BarChart },
  ];

  async function handleAddChapitre(title: string) {
    setLoading(true);
    try {
      await fetch("/api/prof/chapitres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupeId: groupe.id, title }),
      });
      setShowAddChapitre(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleEditChapitre(chapitreId: string, title: string) {
    setLoading(true);
    try {
      await fetch(`/api/prof/chapitres/${chapitreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      setEditChapitre(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteChapitre(chapitreId: string) {
    if (!confirm("Voulez-vous vraiment supprimer ce chapitre ? Tous ses documents seront supprimés.")) return;
    setLoading(true);
    try {
      await fetch(`/api/prof/chapitres/${chapitreId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleReorderChapitres(chapitres: {id: string, order: number}[]) {
    setLoading(true);
    try {
      await fetch("/api/prof/chapitres/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapitres }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleEditGroupe(name: string) {
    setLoading(true);
    try {
      await fetch(`/api/prof/groupes/${groupe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setEditGroupe(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGroupe() {
    if (!confirm("ATTENTION: Voulez-vous vraiment supprimer ce groupe ? Tous ses chapitres, documents et événements seront effacés.")) return;
    setLoading(true);
    try {
      await fetch(`/api/prof/groupes/${groupe.id}`, { method: "DELETE" });
      router.push("/prof/groupes");
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadFile(chapitreId: string, file: File, visibility: string, docType: string, keywords: string) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chapitreId", chapitreId);
      formData.append("visibility", visibility);
      formData.append("docType", docType);
      formData.append("keywords", keywords);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erreur d'upload");
        return;
      }
      setShowUploadDoc({chapitreId: "", open: false});
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAnnonce(title: string, content: string) {
    setLoading(true);
    try {
      await fetch("/api/prof/annonces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupeId: groupe.id, title, content }),
      });
      setShowAddAnnonce(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateDoc(docId: string, visibility: string, docType: string, keywords: string) {
    setLoading(true);
    try {
      const keywordsArray = keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility, docType, keywords: keywordsArray }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        alert(error.error || "Erreur de modification");
        return;
      }

      setEditDoc(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCours(title: string, dateTime: string, room: string) {
    setLoading(true);
    try {
      await fetch("/api/prof/cours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupeId: groupe.id, title, dateTime, room: room || null }),
      });
      setShowAddCours(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTemplate(dayOfWeek: number, startTime: string, endTime: string, room: string) {
    setLoading(true);
    try {
      await fetch(`/api/prof/groupes/${groupe.id}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfWeek, startTime, endTime, room: room || undefined }),
      });
      setShowAddTemplate(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEleveToGroupe(eleveId: string) {
    await fetch("/api/prof/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eleveId, groupeId: groupe.id }),
    });
    router.refresh();
  }

  async function handleRemoveEleveFromGroupe(membershipId: string) {
    await fetch(`/api/prof/memberships/${membershipId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  async function handleEditDocSubmit(visibility: string, docType: string, keywords: string) {
    if (!editDoc) return;
    setLoading(true);
    try {
      await fetch(`/api/documents/${editDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility, docType, keywords: keywords.split(",").map(k => k.trim()).filter(Boolean) }),
      });
      setEditDoc(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleEditDSSubmit(title: string, date: string, keywords: string, chapitreIds: string[]) {
    if (!editDS) return;
    setLoading(true);
    try {
      await fetch(`/api/prof/dates-ds/${editDS.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          date: new Date(date).toISOString(), 
          keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
          chapitreIds 
        }),
      });
      setEditDS(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm("Voulez-vous vraiment supprimer ce document ? Il sera retiré de la base de données.")) return;
    setLoading(true);
    try {
      await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDS(dsId: string) {
    if (!confirm("Voulez-vous vraiment supprimer ce DS ?")) return;
    setLoading(true);
    try {
      await fetch(`/api/prof/dates-ds/${dsId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const memberEleveIds = groupe.memberships.map((m) => m.eleve.id);
  const availableEleves = allEleves.filter((e) => !memberEleveIds.includes(e.id));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/prof/groupes"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux groupes
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{groupe.name}</h1>
            {groupe.isArchived && <Badge variant="warning">Archivé</Badge>}
          </div>
          <p className="text-slate-500 mt-1">{groupe.schoolYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditGroupe(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Renommer
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeleteGroupe} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "stats" && (
        <GroupeStats groupeId={groupe.id} />
      )}

      {activeTab === "chapitres" && (
        <ChapitresTab
          chapitres={groupe.chapitres}
          onAddChapitre={() => setShowAddChapitre(true)}
          onUploadClick={(chapitreId) => setShowUploadDoc({chapitreId, open: true})}
          onEditDoc={setEditDoc}
          onDeleteDoc={handleDeleteDoc}
          onDeleteChapitre={handleDeleteChapitre}
          onEditChapitre={setEditChapitre}
          onReorder={handleReorderChapitres}
        />
      )}

      {activeTab === "eleves" && (
        <ElevesTab
          memberships={groupe.memberships}
          availableEleves={availableEleves}
          onAddEleve={handleAddEleveToGroupe}
          onRemoveEleve={handleRemoveEleveFromGroupe}
          showAddEleve={showAddEleve}
          setShowAddEleve={setShowAddEleve}
        />
      )}

      {activeTab === "annonces" && (
        <AnnoncesTab
          annonces={groupe.annonces}
          onAddAnnonce={() => setShowAddAnnonce(true)}
        />
      )}

      {activeTab === "templates" && (
        <TemplatesTab
          templates={groupe.coursTemplates}
          groupeId={groupe.id}
          onAddTemplate={() => setShowAddTemplate(true)}
        />
      )}

      {activeTab === "edt" && (
        <EDTTab
          cours={groupe.cours}
          onAddCours={() => setShowAddCours(true)}
        />
      )}

      {activeTab === "ds" && (
        <DSTab 
            datesDS={groupe.datesDS} 
            groupeId={groupe.id} 
            chapitres={groupe.chapitres} 
            onEditDS={setEditDS}
            onDeleteDS={handleDeleteDS}
        />
      )}

      {/* Modals */}
      <AddChapitreModal
        open={showAddChapitre}
        onClose={() => setShowAddChapitre(false)}
        onSubmit={handleAddChapitre}
        loading={loading}
      />
      <AddAnnonceModal
        open={showAddAnnonce}
        onClose={() => setShowAddAnnonce(false)}
        onSubmit={handleAddAnnonce}
        loading={loading}
      />
      <AddCoursModal
        open={showAddCours}
        onClose={() => setShowAddCours(false)}
        onSubmit={handleAddCours}
        loading={loading}
      />
      <AddTemplateModal
        open={showAddTemplate}
        onClose={() => setShowAddTemplate(false)}
        onSubmit={handleAddTemplate}
        loading={loading}
      />
      <UploadDocumentModal 
        open={showUploadDoc.open} 
        onClose={() => setShowUploadDoc({chapitreId: "", open: false})}
        onSubmit={(file, visibility, docType, keywords) => 
          handleUploadFile(showUploadDoc.chapitreId, file, visibility, docType, keywords)
        }
        loading={loading}
      />
      {editDoc && (
        <EditDocumentModal 
          doc={editDoc}
          open={!!editDoc} 
          onClose={() => setEditDoc(null)}
          onSubmit={(visibility, docType, keywords) => 
            handleUpdateDoc(editDoc.id, visibility, docType, keywords)
          }
          loading={loading}
        />
      )}
      <EditGroupeModal
        open={editGroupe}
        onClose={() => setEditGroupe(false)}
        onSubmit={handleEditGroupe}
        initialName={groupe.name}
        loading={loading}
      />
      {editChapitre && (
        <EditChapitreModal
          open={!!editChapitre}
          onClose={() => setEditChapitre(null)}
          onSubmit={(title) => handleEditChapitre(editChapitre.id, title)}
          initialTitle={editChapitre.title}
          loading={loading}
        />
      )}
      {editDS && (
        <EditDSModal
          ds={editDS}
          chapitres={groupe.chapitres}
          open={!!editDS}
          onClose={() => setEditDS(null)}
          onSubmit={(title, date, keywords, chapitreIds) => handleEditDSSubmit(title, date, keywords, chapitreIds)}
          loading={loading}
        />
      )}
    </div>
  );
}

// --- Sub-components ---

function ChapitresTab({
  chapitres,
  onAddChapitre,
  onUploadClick,
  onEditDoc,
  onDeleteDoc,
  onDeleteChapitre,
  onEditChapitre,
  onReorder,
}: {
  chapitres: GroupeDetailProps["groupe"]["chapitres"];
  onAddChapitre: () => void;
  onUploadClick: (chapitreId: string) => void;
  onEditDoc: (doc: any) => void;
  onDeleteDoc: (docId: string) => void;
  onDeleteChapitre: (chapitreId: string) => void;
  onEditChapitre: (chapitre: any) => void;
  onReorder: (chapitres: {id: string, order: number}[]) => void;
}) {
  const handleMove = (index: number, direction: "up" | "down") => {
    const newChapitres = [...chapitres].sort((a, b) => a.order - b.order);
    if (direction === "up" && index > 0) {
      const temp = newChapitres[index].order;
      newChapitres[index].order = newChapitres[index - 1].order;
      newChapitres[index - 1].order = temp;
    } else if (direction === "down" && index < newChapitres.length - 1) {
      const temp = newChapitres[index].order;
      newChapitres[index].order = newChapitres[index + 1].order;
      newChapitres[index + 1].order = temp;
    }
    onReorder(newChapitres.map(c => ({ id: c.id, order: c.order })));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onAddChapitre} size="sm">
          <Plus className="h-4 w-4" />
          Ajouter un chapitre
        </Button>
      </div>

      {chapitres.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun chapitre</p>
        </div>
      ) : (
        [...chapitres].sort((a, b) => a.order - b.order).map((chapitre, index, sortedChapitres) => (
          <div key={chapitre.id} className="card p-5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <button 
                    disabled={index === 0}
                    onClick={() => handleMove(index, "up")}
                    className="text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                  </button>
                  <button 
                    disabled={index === sortedChapitres.length - 1}
                    onClick={() => handleMove(index, "down")}
                    className="text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                </div>
                <h3 className="font-semibold text-slate-900 text-lg">
                  {chapitre.order}. {chapitre.title}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onUploadClick(chapitre.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
                <button
                  onClick={() => onEditChapitre(chapitre)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Renommer le chapitre"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteChapitre(chapitre.id)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Supprimer le chapitre"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {chapitre.documents.length > 0 ? (
              <div className="space-y-2">
                {chapitre.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-2 p-3 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{doc.fileName}</p>
                          <p className="text-xs text-slate-400">
                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} Ko` : ""} · {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={doc.indexStatus as "PENDING" | "PROCESSING" | "INDEXED" | "ERROR"} />
                        <button
                          onClick={() => onEditDoc(doc)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteDoc(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 ml-7">
                      <Badge variant={doc.visibility === "BOTH" ? "success" : doc.visibility === "STUDENTS_ONLY" ? "info" : "warning"} size="sm">
                        {doc.visibility === "BOTH" ? "Tous" : doc.visibility === "STUDENTS_ONLY" ? "Élèves" : "IA"}
                      </Badge>
                      <Badge variant="outline" size="sm">{doc.docType.replace("_", " ")}</Badge>
                      {doc.keywords.map((kw, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Aucun document</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ElevesTab({
  memberships,
  availableEleves,
  onAddEleve,
  onRemoveEleve,
  showAddEleve,
  setShowAddEleve,
}: {
  memberships: GroupeDetailProps["groupe"]["memberships"];
  availableEleves: GroupeDetailProps["allEleves"];
  onAddEleve: (eleveId: string) => void;
  onRemoveEleve: (membershipId: string) => void;
  showAddEleve: boolean;
  setShowAddEleve: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAddEleve(!showAddEleve)} size="sm">
          <UserPlus className="h-4 w-4" />
          Ajouter un élève
        </Button>
      </div>

      {showAddEleve && availableEleves.length > 0 && (
        <div className="card p-4 space-y-2 animate-fade-in">
          <p className="text-sm font-medium text-slate-700 mb-2">Élèves disponibles :</p>
          {availableEleves.map((eleve) => (
            <div
              key={eleve.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
            >
              <span className="text-sm text-slate-700">
                {eleve.firstName} {eleve.lastName} ({eleve.identifiant})
              </span>
              <Button size="sm" variant="secondary" onClick={() => onAddEleve(eleve.id)}>
                <Plus className="h-3 w-3" />
                Ajouter
              </Button>
            </div>
          ))}
        </div>
      )}

      {memberships.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun élève dans ce groupe</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Nom</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberships.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {m.eleve.firstName} {m.eleve.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{m.eleve.identifiant}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.eleve.isActive ? "success" : "danger"}>
                      {m.eleve.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onRemoveEleve(m.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Retirer du groupe"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnnoncesTab({
  annonces,
  onAddAnnonce,
}: {
  annonces: GroupeDetailProps["groupe"]["annonces"];
  onAddAnnonce: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onAddAnnonce} size="sm">
          <Plus className="h-4 w-4" />
          Nouvelle annonce
        </Button>
      </div>

      {annonces.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucune annonce</p>
        </div>
      ) : (
        <div className="space-y-3">
          {annonces.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-slate-900">{a.title}</h3>
                <span className="text-xs text-slate-400">{formatDate(a.publishedAt)}</span>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplatesTab({
  templates,
  groupeId,
  onAddTemplate,
}: {
  templates: GroupeDetailProps["groupe"]["coursTemplates"];
  groupeId: string;
  onAddTemplate: () => void;
}) {
  const router = useRouter();
  
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce modèle ? Les cours futurs générés seront supprimés.")) return;
    await fetch(`/api/prof/groupes/${groupeId}/templates/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onAddTemplate} size="sm">
          <Plus className="h-4 w-4" />
          Nouveau modèle
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun modèle de cours récurrent</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{days[t.dayOfWeek]}</p>
                <p className="text-sm text-slate-500">
                  {t.startTime} - {t.endTime} {t.room && ` · Salle ${t.room}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                className="p-2 text-slate-400 hover:text-red-500 rounded transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EDTTab({
  cours,
  onAddCours,
}: {
  cours: GroupeDetailProps["groupe"]["cours"];
  onAddCours: () => void;
}) {
  const router = useRouter();

  async function toggleStatus(coursId: string, updates: any) {
    await fetch(`/api/prof/cours/${coursId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Les cours récurrents sont générés automatiquement.
        </p>
        <Button onClick={onAddCours} size="sm">
          <Plus className="h-4 w-4" />
          Ajouter cours ponctuel
        </Button>
      </div>

      {cours.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun cours planifié</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cours.map((c) => (
            <div key={c.id} className={`card p-4 flex items-center gap-4 ${c.isCancelled ? 'opacity-50' : ''}`}>
              <div className="w-14 h-14 rounded-lg bg-blue-100 flex flex-col items-center justify-center shrink-0">
                <span className="text-xs text-blue-600 font-medium">
                  {new Date(c.dateTime).toLocaleDateString("fr-FR", { weekday: "short" })}
                </span>
                <span className="text-xl font-bold text-blue-700">
                  {new Date(c.dateTime).getDate()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={`font-medium ${c.isCancelled ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {c.title}
                  </p>
                  {c.isDS && <Badge variant="info">DS</Badge>}
                  {c.isCancelled && <Badge variant="danger">Annulé</Badge>}
                  {c.isException && !c.isCancelled && <Badge variant="warning">Modifié</Badge>}
                </div>
                <p className="text-sm text-slate-500">
                  {new Date(c.dateTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {c.endTime && ` - ${new Date(c.endTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                  {c.room ? ` · Salle ${c.room}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleStatus(c.id, { isDS: !c.isDS })}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  {c.isDS ? "- DS" : "+ DS"}
                </button>
                <button
                  onClick={() => toggleStatus(c.id, { isCancelled: !c.isCancelled })}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-red-600 transition-colors"
                >
                  {c.isCancelled ? "Rétablir" : "Annuler"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DSTab({
  datesDS,
  groupeId,
  chapitres,
  onEditDS,
  onDeleteDS,
}: {
  datesDS: GroupeDetailProps["groupe"]["datesDS"];
  groupeId: string;
  chapitres: GroupeDetailProps["groupe"]["chapitres"];
  onEditDS: (ds: any) => void;
  onDeleteDS: (dsId: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [keywords, setKeywords] = useState("");
  const [selectedChapitres, setSelectedChapitres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/prof/dates-ds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupeId,
          title,
          date: new Date(date).toISOString(),
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          chapitreIds: selectedChapitres,
        }),
      });
      setShowCreate(false);
      setTitle("");
      setDate("");
      setKeywords("");
      setSelectedChapitres([]);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4" />
          Nouveau DS
        </Button>
      </div>

      {datesDS.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun DS planifié</p>
        </div>
      ) : (
        <div className="space-y-3">
          {datesDS.map((ds) => (
            <div key={ds.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-slate-900">{ds.title}</h3>
                  <div>
                    <Badge variant="info">{formatDate(ds.date)}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditDS(ds)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteDS(ds.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {ds.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ds.keywords.map((kw) => (
                    <Badge key={kw} variant="outline" size="sm">{kw}</Badge>
                  ))}
                </div>
              )}
              {ds.chapitres.length > 0 && (
                <p className="text-sm text-slate-500">
                  Chapitres : {ds.chapitres.map((c) => c.chapitre.title).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau DS" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input
            label="Mots-clés (séparés par des virgules)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="macro-économie, PIB, inflation"
          />
          {chapitres.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Chapitres concernés
              </label>
              <div className="space-y-2">
                {chapitres.map((ch) => (
                  <label key={ch.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedChapitres.includes(ch.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChapitres([...selectedChapitres, ch.id]);
                        } else {
                          setSelectedChapitres(selectedChapitres.filter((id) => id !== ch.id));
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {ch.title}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// --- Modals ---

function AddChapitreModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void; onSubmit: (title: string) => void; loading: boolean;
}) {
  const [title, setTitle] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Nouveau chapitre">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(title); setTitle(""); }} className="space-y-4">
        <Input label="Titre du chapitre" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Créer</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddAnnonceModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void; onSubmit: (title: string, content: string) => void; loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle annonce">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(title, content); setTitle(""); setContent(""); }} className="space-y-4">
        <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Textarea label="Contenu" value={content} onChange={(e) => setContent(e.target.value)} rows={4} required />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Publier</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddCoursModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void; onSubmit: (title: string, dateTime: string, room: string) => void; loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [room, setRoom] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Nouveau cours">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(title, dateTime, room); setTitle(""); setDateTime(""); setRoom(""); }} className="space-y-4">
        <Input label="Intitulé" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Date et heure" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
        <Input label="Salle (optionnel)" value={room} onChange={(e) => setRoom(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Ajouter</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddTemplateModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void; onSubmit: (dayOfWeek: number, startTime: string, endTime: string, room: string) => void; loading: boolean;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Nouveau modèle de cours">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(dayOfWeek, startTime, endTime, room); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Jour de la semaine</label>
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="input w-full">
            <option value={1}>Lundi</option>
            <option value={2}>Mardi</option>
            <option value={3}>Mercredi</option>
            <option value={4}>Jeudi</option>
            <option value={5}>Vendredi</option>
            <option value={6}>Samedi</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Heure de début" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <Input label="Heure de fin" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>
        <Input label="Salle (optionnel)" value={room} onChange={(e) => setRoom(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Créer</Button>
        </div>
      </form>
    </Modal>
  );
}

function UploadDocumentModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void; onSubmit: (file: File, visibility: string, docType: string, keywords: string) => void; loading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState("BOTH");
  const [docType, setDocType] = useState("COURS");
  const [keywords, setKeywords] = useState("");

  const docTypes = ["COURS", "EXERCICES", "SUJET_DS", "CORRECTION_DS", "CORRECTION_EXERCICES", "SUJET_DM", "COMPLEMENTS", "AUTRE"];

  return (
    <Modal open={open} onClose={onClose} title="Ajouter un document" size="lg">
      <form onSubmit={(e) => { 
        e.preventDefault(); 
        if (file) {
          onSubmit(file, visibility, docType, keywords);
          setFile(null);
          setKeywords("");
        }
      }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fichier</label>
          <input 
            type="file" 
            required 
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Visibilité</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="input w-full">
              <option value="BOTH">Les deux (Élèves + IA)</option>
              <option value="STUDENTS_ONLY">Élèves uniquement</option>
              <option value="AI_ONLY">IA uniquement (Caché)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type de document</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="input w-full">
              {docTypes.map(t => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <Input 
          label="Mots-clés (séparés par des virgules)" 
          value={keywords} 
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="ex: macro-économie, PIB" 
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading} disabled={!file}>Upload</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditDocumentModal({ doc, open, onClose, onSubmit, loading }: {
  doc: any; open: boolean; onClose: () => void; onSubmit: (visibility: string, docType: string, keywords: string) => void; loading: boolean;
}) {
  const [visibility, setVisibility] = useState(doc.visibility || "BOTH");
  const [docType, setDocType] = useState(doc.docType || "COURS");
  const [keywords, setKeywords] = useState((doc.keywords || []).join(", "));

  const docTypes = ["COURS", "EXERCICES", "SUJET_DS", "CORRECTION_DS", "CORRECTION_EXERCICES", "SUJET_DM", "COMPLEMENTS", "AUTRE"];

  return (
    <Modal open={open} onClose={onClose} title="Modifier le document" size="lg">
      <form onSubmit={(e) => { 
        e.preventDefault(); 
        onSubmit(visibility, docType, keywords);
      }} className="space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Visibilité</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="input w-full">
              <option value="BOTH">Les deux (Élèves + IA)</option>
              <option value="STUDENTS_ONLY">Élèves uniquement</option>
              <option value="AI_ONLY">IA uniquement (Caché)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type de document</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="input w-full">
              {docTypes.map(t => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <Input 
          label="Mots-clés (séparés par des virgules)" 
          value={keywords} 
          onChange={(e) => setKeywords(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditDSModal({ ds, chapitres, open, onClose, onSubmit, loading }: {
  ds: any; chapitres: any[]; open: boolean; onClose: () => void; onSubmit: (title: string, date: string, keywords: string, chapitreIds: string[]) => void; loading: boolean;
}) {
  const [title, setTitle] = useState(ds.title || "");
  const [date, setDate] = useState(ds.date ? new Date(ds.date).toISOString().slice(0, 10) : "");
  const [keywords, setKeywords] = useState((ds.keywords || []).join(", "));
  const [selectedChapitres, setSelectedChapitres] = useState<string[]>(ds.chapitres?.map((c: any) => c.chapitreId || c.chapitre?.id) || []);

  return (
    <Modal open={open} onClose={onClose} title="Modifier le DS" size="lg">
      <form onSubmit={(e) => { 
        e.preventDefault(); 
        onSubmit(title, date, keywords, selectedChapitres);
      }} className="space-y-4">
        <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input
          label="Mots-clés (séparés par des virgules)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        {chapitres.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Chapitres concernés
            </label>
            <div className="space-y-2">
              {chapitres.map((ch) => (
                <label key={ch.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedChapitres.includes(ch.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedChapitres([...selectedChapitres, ch.id]);
                      } else {
                        setSelectedChapitres(selectedChapitres.filter((id) => id !== ch.id));
                      }
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {ch.title}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditGroupeModal({ open, onClose, onSubmit, initialName, loading }: {
  open: boolean; onClose: () => void; onSubmit: (name: string) => void; initialName: string; loading: boolean;
}) {
  const [name, setName] = useState(initialName);

  return (
    <Modal open={open} onClose={onClose} title="Renommer le groupe">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(name); }} className="space-y-4">
        <Input label="Nom du groupe" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading} disabled={!name.trim()}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditChapitreModal({ open, onClose, onSubmit, initialTitle, loading }: {
  open: boolean; onClose: () => void; onSubmit: (title: string) => void; initialTitle: string; loading: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);

  return (
    <Modal open={open} onClose={onClose} title="Renommer le chapitre">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(title); }} className="space-y-4">
        <Input label="Titre du chapitre" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading} disabled={!title.trim()}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}
