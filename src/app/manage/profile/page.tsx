'use client'

import { useEffect, useState } from 'react'
import { getAuth, updateProfile, User } from 'firebase/auth'
import { auth, db } from '@/lib/firebaseConfig'
import { useRouter } from 'next/navigation'
import { Field, Input, Label, Fieldset } from '@headlessui/react'
import { ToastContainer, toast } from 'react-toastify'
import { getDocs, collection, query, where, updateDoc, doc } from 'firebase/firestore'
import { withAuth } from '@/lib/withAuth'

function ManageProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const currentUser = auth.currentUser
    if (currentUser) {
      setUser(currentUser)
      setDisplayName(currentUser.displayName || '')
      setPhotoURL(currentUser.photoURL || '')
    } else {
      router.push('/auth')
    }
    setLoading(false)
  }, [])

  const handleImageUpload = async () => {
    if (!imageFile) return photoURL
    const formData = new FormData()
    formData.append('file', imageFile)
    formData.append('upload_preset', 'unsigned_blog_upload')
    formData.append('folder', 'profile_pics')

    const res = await fetch('https://api.cloudinary.com/v1_1/dou0jhjtx/image/upload', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    return data.secure_url
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setImageFile(file)
    if (file) setPreview(URL.createObjectURL(file))
    else setPreview(null)
  }

  const updateUserPosts = async (uid: string, name: string, photo: string) => {
    const q = query(collection(db, 'entry'), where('author.uid', '==', uid))
    const snapshot = await getDocs(q)
    const updates = snapshot.docs.map(docSnap =>
      updateDoc(doc(db, 'entry', docSnap.id), {
        'author.name': name,
        'author.photoURL': photo,
      })
    )
    await Promise.all(updates)
  }

  const handleSave = async () => {
    if (!user) return
    try {
      setSaving(true)
      const uploadedURL = await handleImageUpload()
      await updateProfile(user, {
        displayName,
        photoURL: uploadedURL,
      })
      await updateUserPosts(user.uid, displayName, uploadedURL || '')
      toast.success('Profile and posts updated!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">Manage Profile</h1>

      <div className="flex flex-col items-center gap-4 mb-6">
        <img
          src={preview || photoURL || 'https://res.cloudinary.com/dou0jhjtx/image/upload/v1750159701/Default_pfp_cznk3b.jpg'}
          alt="Profile"
          width={100}
          height={100}
          className="rounded-full object-cover"
        />
      </div>

      <Fieldset className="space-y-8">
        <Field>
          <Label className="block mb-1 font-medium">Display Name</Label>
          <Input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full mb-4 p-2 border rounded"
          />
        </Field>

        <Field>
          <Label className="block mb-1 font-medium">Email (read-only)</Label>
          <Input
            type="email"
            value={user?.email || ''}
            readOnly
            className="w-full mb-4 p-2 bg-gray-100 border rounded text-gray-500"
          />
        </Field>

        <Field>
          <Label className="text-sm/6 font-medium text-black">Change Profile Image</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0 file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none mb-6"
          />
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="mb-6 max-h-64 w-auto rounded-lg border border-gray-300 object-contain"
            />
          )}
        </Field>

        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </Fieldset>
    </div>
  )
}
export default withAuth(ManageProfile)
