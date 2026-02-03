
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * ENHANCED CONTROLLER using express-fileupload
 * This assumes app.use(fileUpload()) is configured in your main express file.
 */
export const addUser = async (req: any, res: any): Promise<any> => {
    // 1. Perform authentication/authorization checks
    const user = ensureUser(req, res);
    if (!user) return;
    if (!requireRole(res, user.role, ['ops', 'owner'])) return;

    // 2. Extract text fields from req.body
    const { 
        username, 
        pin, 
        role, 
        organisationId, 
        name, 
        phoneNumber,      // New Parameter
        nationalId, 
        passportNumber,   // New Parameter
        pdpNumber, 
        pdpExpiry 
    } = req.body;

    // 3. Basic Validation
    if (!username || !pin || !role || !organisationId) {
        return res.status(400).json({ 
            message: 'Missing required account fields (username, pin, role, organisationId)', 
            status: 0 
        });
    }

    // 4. Handle File Uploads (express-fileupload)
    const files = req.files;
    let idDocumentUrl = '';
    let pdpDocumentUrl = '';

    // 5. Driver Compliance Logic
    if (role === 'driver') {
        // Validation: Must have at least one ID type and all PrDP info
        const hasId = !!(nationalId || passportNumber);
        if (!hasId || !pdpNumber || !pdpExpiry) {
            return res.status(400).json({ 
                message: 'Drivers require compliance data: National ID or Passport, PrDP Number, and Expiry Date.', 
                status: 0 
            });
        }

        if (!files || !files.idDocument || !files.pdpDocument) {
            return res.status(400).json({ 
                message: 'Drivers must upload physical copies of ID/Passport and PrDP permit.', 
                status: 0 
            });
        }

        try {
            // Processing Identity Document (ID or Passport)
            const idFile = Array.isArray(files.idDocument) ? files.idDocument[0] : files.idDocument;
            const idExt = path.extname(idFile.name);
            const idFileName = `id_${uuidv4()}${idExt}`;
            // In production, ensure this directory exists or use Cloud Storage
            const idPath = path.join(__dirname, 'uploads', 'compliance', idFileName);
            
            await idFile.mv(idPath);
            idDocumentUrl = `/uploads/compliance/${idFileName}`;

            // Processing PrDP Document
            const pdpFile = Array.isArray(files.pdpDocument) ? files.pdpDocument[0] : files.pdpDocument;
            const pdpExt = path.extname(pdpFile.name);
            const pdpFileName = `pdp_${uuidv4()}${pdpExt}`;
            const pdpPath = path.join(__dirname, 'uploads', 'compliance', pdpFileName);
            
            await pdpFile.mv(pdpPath);
            pdpDocumentUrl = `/uploads/compliance/${pdpFileName}`;

        } catch (uploadErr) {
            console.error('File storage error:', uploadErr);
            return res.status(500).json({ 
                message: 'Failed to write compliance documents to terminal storage.', 
                status: 0 
            });
        }
    }

    // 6. Persistence in Database
    // Extend your createUser function to handle the new parameters
    const success = await createUser(
        username, 
        pin, 
        role, 
        organisationId, 
        name, 
        {
            phoneNumber,
            nationalId,
            passportNumber,
            pdpNumber,
            pdpExpiry,
            idDocumentUrl,
            pdpDocumentUrl
        }
    );

    if (success) {
        res.status(201).json({ 
            message: 'User and Compliance Identity authorized successfully.', 
            status: 1, 
            data: { username, role, phoneNumber } 
        });
    } else {
        res.status(409).json({ 
            message: 'Identity Conflict: Username already exists in the global registry.', 
            status: 0 
        });
    }
};

/**
 * MOCK HELPERS (Match these to your actual implementation)
 */
const ensureUser = (req: any, res: any) => req.user;
const requireRole = (res: any, userRole: string, allowed: string[]) => allowed.includes(userRole);
const createUser = async (
    username: string, 
    pin: string, 
    role: string, 
    orgId: string, 
    name: string, 
    extra: {
        phoneNumber?: string,
        nationalId?: string,
        passportNumber?: string,
        pdpNumber?: string,
        pdpExpiry?: string,
        idDocumentUrl?: string,
        pdpDocumentUrl?: string
    }
) => {
    // Implement database logic here
    console.log('Saving User with Compliance:', { username, role, ...extra });
    return true; 
};
