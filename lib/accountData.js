// Browser-side reads of the signed-in user's own orders and quotes. Firestore
// security rules only return documents whose `uid` matches the caller.
const load = async () => {
    const [{ getClientDb }, firestore] = await Promise.all([
        import('./firebase/client'),
        import('firebase/firestore'),
    ]);
    return { db: getClientDb(), fs: firestore };
};

export async function listMine(collectionName, uid) {
    const { db, fs } = await load();
    const snapshot = await fs.getDocs(
        fs.query(
            fs.collection(db, collectionName),
            fs.where('uid', '==', uid),
            fs.orderBy('created_at', 'desc'),
            fs.limit(100)
        )
    );
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Returns null when the document is missing or belongs to someone else.
export async function getMine(collectionName, id) {
    const { db, fs } = await load();
    try {
        const snapshot = await fs.getDoc(fs.doc(db, collectionName, id));
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
        if (error?.code === 'permission-denied') return null;
        throw error;
    }
}
