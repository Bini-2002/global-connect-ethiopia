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
    hostedEventsBefore:string
  };
export type Props = {
    formData: FormDataType;
    setFormData: React.Dispatch<React.SetStateAction<FormDataType>>;
    handleChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => void;
      handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
      handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
      nextStep?: () => void;
      backStep?: () => void;
      handleDrop?: (e: React.DragEvent<HTMLInputElement>) => void; 

    }
   