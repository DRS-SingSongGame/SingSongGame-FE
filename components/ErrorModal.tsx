import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";

interface ErrorModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

const ErrorModal = ({ open, message, onClose }: ErrorModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <div className="text-red-600 text-center">
            ⚠️ 입장 오류
            </div>
            </DialogTitle>
        </DialogHeader>
        <p className="text-gray-700 text-center mt-2">{message}</p>
        <div className="mt-4 flex justify-center">
          <Button onClick={onClose}>확인</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorModal;
