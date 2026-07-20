from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    content = file_path.read_text(encoding='utf-8')
    if old not in content:
        raise SystemExit(f'Trecho não encontrado em {path}: {old[:100]!r}')
    file_path.write_text(content.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/types/profile.ts',
    "  phone: string | null;\n  logo_url: string | null;",
    "  phone: string | null;\n  avatar_url: string | null;\n  logo_url: string | null;",
)

replace_once(
    'src/services/profileService.ts',
    "const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '-');\n",
    "const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '-');\nconst PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;\nconst PROFILE_AVATAR_TYPES = new Map([\n  ['image/jpeg', 'jpg'],\n  ['image/png', 'png'],\n  ['image/webp', 'webp'],\n]);\n\nfunction resolveProfileAvatarPath(value: string, userId: string) {\n  const publicMarker = '/storage/v1/object/public/logos/';\n  const rawPath = value.includes(publicMarker)\n    ? value.split(publicMarker)[1]?.split('?')[0] || ''\n    : value;\n  const path = decodeURIComponent(rawPath);\n\n  if (!path.startsWith(`${userId}/avatars/`)) {\n    throw new Error('A foto informada não pertence a esta conta.');\n  }\n\n  return path;\n}\n",
)

replace_once(
    'src/services/profileService.ts',
    "  async uploadLogo(file: File, userId: string) {",
    "  async uploadProfileAvatar(file: File, userId: string) {\n    const extension = PROFILE_AVATAR_TYPES.get(file.type);\n    if (!extension) {\n      throw new Error('Envie uma foto em PNG, JPG ou WebP.');\n    }\n\n    if (file.size > PROFILE_AVATAR_MAX_BYTES) {\n      throw new Error('A foto de perfil deve ter no máximo 2 MB.');\n    }\n\n    const filePath = `${userId}/avatars/profile-${Date.now()}.${extension}`;\n    const { error: uploadError } = await supabase.storage\n      .from('logos')\n      .upload(filePath, file, {\n        contentType: file.type,\n        cacheControl: '3600',\n        upsert: false,\n      });\n\n    if (uploadError) throw uploadError;\n\n    const { data } = supabase.storage\n      .from('logos')\n      .getPublicUrl(filePath);\n\n    return { url: data.publicUrl, path: filePath };\n  },\n\n  async deleteProfileAvatar(avatarUrlOrPath: string, userId: string) {\n    const filePath = resolveProfileAvatarPath(avatarUrlOrPath, userId);\n    const { error } = await supabase.storage.from('logos').remove([filePath]);\n    if (error) throw error;\n  },\n\n  async uploadLogo(file: File, userId: string) {",
)

replace_once(
    'src/components/Layout.tsx',
    'import { useState } from "react";',
    'import { useEffect, useState } from "react";',
)
replace_once(
    'src/components/Layout.tsx',
    'import { Button } from "./ui/Button";\n',
    'import { Button } from "./ui/Button";\nimport { profileService } from "../services/profileService";\nimport { Profile } from "../types/profile";\n',
)
replace_once(
    'src/components/Layout.tsx',
    '  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);\n  \n  const handleLogout',
    "  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);\n  const [navbarProfile, setNavbarProfile] = useState<Pick<Profile, 'id' | 'name' | 'company_name' | 'seller_name' | 'avatar_url'> | null>(null);\n  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);\n\n  useEffect(() => {\n    if (!user?.id) {\n      setNavbarProfile(null);\n      return;\n    }\n\n    let mounted = true;\n    void profileService.getProfile(user.id)\n      .then((profile) => {\n        if (mounted) setNavbarProfile(profile);\n      })\n      .catch((error) => {\n        console.warn('Não foi possível carregar o perfil da navbar:', error);\n      });\n\n    const handleProfileUpdated = (event: Event) => {\n      const nextProfile = (event as CustomEvent<Profile>).detail;\n      if (nextProfile?.id === user.id) setNavbarProfile(nextProfile);\n    };\n\n    window.addEventListener('solamigo:profile-updated', handleProfileUpdated);\n    return () => {\n      mounted = false;\n      window.removeEventListener('solamigo:profile-updated', handleProfileUpdated);\n    };\n  }, [user?.id]);\n\n  const displayName = navbarProfile?.seller_name || navbarProfile?.name || user?.user_metadata?.name || 'Usuário';\n  const displayCompany = navbarProfile?.company_name || user?.user_metadata?.company_name || 'SolAmigo Pro';\n  const avatarUrl = navbarProfile?.avatar_url || user?.user_metadata?.avatar_url || null;\n\n  useEffect(() => {\n    setAvatarLoadFailed(false);\n  }, [avatarUrl]);\n  \n  const handleLogout",
)
replace_once(
    'src/components/Layout.tsx',
    "            <div className=\"w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-blue-hover flex items-center justify-center text-xs font-bold text-white uppercase shrink-0\">\n              {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}\n            </div>\n            {isSidebarExpanded && (\n              <div className=\"overflow-hidden flex-1\">\n                <p className=\"text-xs font-medium text-brand-dark truncate\">{user?.user_metadata?.name || 'Usuário'}</p>\n                <p className=\"text-[10px] text-slate-500 truncate\">{user?.user_metadata?.company_name || 'SolAmigo Pro'}</p>\n              </div>\n            )}",
    "            {avatarUrl && !avatarLoadFailed ? (\n              <img\n                src={avatarUrl}\n                alt={`Foto de perfil de ${displayName}`}\n                className=\"w-8 h-8 rounded-full object-cover shrink-0 border border-brand-border\"\n                onError={() => setAvatarLoadFailed(true)}\n              />\n            ) : (\n              <div className=\"w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-blue-hover flex items-center justify-center text-xs font-bold text-white uppercase shrink-0\">\n                {displayName.charAt(0) || user?.email?.charAt(0) || 'U'}\n              </div>\n            )}\n            {isSidebarExpanded && (\n              <div className=\"overflow-hidden flex-1\">\n                <p className=\"text-xs font-medium text-brand-dark truncate\">{displayName}</p>\n                <p className=\"text-[10px] text-slate-500 truncate\">{displayCompany}</p>\n              </div>\n            )}",
)
