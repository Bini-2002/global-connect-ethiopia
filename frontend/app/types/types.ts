export type FormDataType = {
    registrationType: string;
    orgName: string;
    position: string;
    orgType: string;
    industry: string;
    profession: string;
    prsonalBio: string;
    SocialLink: string;
    Experience: string;
    companySize: string;
    website: string;
    description: string;
    licenseFile: File | null;
    NationalID: File | null;
    hostedEventsBefore: string;
    [key: string]: unknown;
  };
export type Props = {
    formData: Record<string, unknown>;
    setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
    handleChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => void;
      handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
      handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
      nextStep?: () => void;
      backStep?: () => void;
      handleDrop?: (e: React.DragEvent<HTMLInputElement>) => void; 

    }
   