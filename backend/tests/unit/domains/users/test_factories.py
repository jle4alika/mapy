from domains.users.application.dto import UserPublicDTO
from tests.seeder import UserPublicDTOFactory


def test_public_dto_factory_builds_valid_model() -> None:
    dto = UserPublicDTOFactory.build(username="factory_user")
    assert isinstance(dto, UserPublicDTO)
    assert dto.username == "factory_user"
