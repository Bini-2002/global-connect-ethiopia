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
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    handleChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => void;
      handleFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
      handleSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
      nextStep?: () => void;
      backStep?: () => void;
      handleDrop?: (...args: any[]) => void;
      Error?: string;
      error?: string;
    };
   
